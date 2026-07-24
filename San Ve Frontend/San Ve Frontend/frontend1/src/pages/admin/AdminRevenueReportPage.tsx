// src/pages/admin/AdminRevenueReportPage.tsx
// Báo cáo doanh thu theo ngày / tháng / phim / rạp
import { useCallback, useEffect, useState } from 'react';
import { statsApi } from '../../api/adminApi';
import type { RevenueGroupBy, RevenueReport } from '../../types/admin';
import { Btn, EmptyState, ErrorBanner, Field, Loading, PageHeader, TableShell, Td, Th } from '../../components/admin/AdminUI';
import { formatVnd, inputClass } from '../../components/admin/adminUiHelpers';

const GROUP_OPTIONS: { value: RevenueGroupBy; label: string }[] = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'movie', label: 'Theo phim' },
  { value: 'cinema', label: 'Theo rạp' },
];

/** Mặc định: 30 ngày gần nhất */
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

export default function AdminRevenueReportPage() {
  const range = defaultRange();
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('day');
  const [fromDate, setFromDate] = useState(range.fromDate);
  const [toDate, setToDate] = useState(range.toDate);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await statsApi.getRevenueReport({
        groupBy,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setReport(res);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được báo cáo doanh thu');
    } finally {
      setLoading(false);
    }
  }, [groupBy, fromDate, toDate]);

  useEffect(() => {
    // Tải dữ liệu lần đầu khi mount. Rule react-hooks/set-state-in-effect
    // báo vì fetchReport() gọi setLoading(true) đồng bộ ở đầu hàm; đây là
    // pattern fetch-on-mount hợp lệ nên tắt rule tại đúng dòng này.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReport();
    // chỉ tự động tải lại khi đổi cách nhóm; ngày do người dùng bấm "Xem báo cáo"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  const items = report?.items ?? [];
  const maxRevenue = items.reduce((m, r) => Math.max(m, Number(r.revenue ?? 0)), 0);

  const exportCsv = () => {
    if (items.length === 0) return;
    const header = 'Nhom,So don,Doanh thu\n';
    const body = items
      .map((r) => `"${r.label}",${r.bookings},${r.revenue}`)
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doanh-thu-${groupBy}-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo doanh thu"
        subtitle="Thống kê doanh thu từ các đơn đã thanh toán"
        actions={
          <Btn variant="purple" onClick={exportCsv} disabled={items.length === 0}>
            ⬇ Xuất CSV
          </Btn>
        }
      />

      {/* Bộ lọc */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <Field label="Nhóm theo">
          <select
            className={inputClass}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as RevenueGroupBy)}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Từ ngày">
          <input
            type="date"
            className={inputClass}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            className={inputClass}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Field>
        <Btn variant="primary" onClick={() => void fetchReport()} className="h-[38px]">
          Xem báo cáo
        </Btn>
      </div>

      <ErrorBanner message={error} />

      {/* Thẻ tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon="💰"
          label="Tổng doanh thu"
          value={formatVnd(report?.totalRevenue ?? 0)}
        />
        <SummaryCard
          icon="🎟️"
          label="Số đơn đã thanh toán"
          value={String(report?.totalBookings ?? 0)}
        />
        <SummaryCard
          icon="📈"
          label="Trung bình / đơn"
          value={formatVnd(
            report && report.totalBookings > 0
              ? Math.round(report.totalRevenue / report.totalBookings)
              : 0,
          )}
        />
      </div>

      <TableShell>
        {loading ? (
          <Loading label="Đang tính toán..." />
        ) : items.length === 0 ? (
          <EmptyState icon="📊" label="Không có dữ liệu trong khoảng thời gian này" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase">
              <tr>
                <Th>#</Th>
                <Th>{GROUP_OPTIONS.find((o) => o.value === groupBy)?.label}</Th>
                <Th>Số đơn</Th>
                <Th>Doanh thu</Th>
                <Th>Tỷ trọng</Th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {items.map((r, i) => {
                const pct = maxRevenue > 0 ? (Number(r.revenue) / maxRevenue) * 100 : 0;
                const share =
                  report && report.totalRevenue > 0
                    ? (Number(r.revenue) / report.totalRevenue) * 100
                    : 0;
                return (
                  <tr
                    key={`${r.label}-${i}`}
                    className="border-t border-gray-800 hover:bg-gray-800/40"
                  >
                    <Td>{i + 1}</Td>
                    <Td className="font-semibold text-white">{r.label}</Td>
                    <Td>{r.bookings}</Td>
                    <Td className="font-semibold text-green-300">{formatVnd(r.revenue)}</Td>
                    <Td>
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-extrabold text-white">{value}</div>
    </div>
  );
}
