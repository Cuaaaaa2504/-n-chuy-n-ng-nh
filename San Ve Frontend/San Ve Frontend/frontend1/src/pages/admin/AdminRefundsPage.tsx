// src/pages/admin/AdminRefundsPage.tsx
// Danh sách yêu cầu hoàn tiền + duyệt / từ chối
import { useCallback, useEffect, useState } from 'react';
import { refundApi } from '../../api/adminApi';
import type { AdminRefund, RefundStatus } from '../../types/admin';
import {
  Btn,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pill,
  TableShell,
  Td,
  Th,
  Toast,
  formatDateTime,
  formatVnd,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';

const STATUS_TABS: { value: '' | RefundStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'SUCCESS', label: 'Đã hoàn' },
  { value: 'FAILED', label: 'Từ chối / Thất bại' },
];

const STATUS_META: Record<RefundStatus, { label: string; color: 'yellow' | 'green' | 'red' }> = {
  PENDING: { label: 'Chờ duyệt', color: 'yellow' },
  SUCCESS: { label: 'Đã hoàn tiền', color: 'green' },
  FAILED: { label: 'Từ chối / Thất bại', color: 'red' },
};

export default function AdminRefundsPage() {
  const [items, setItems] = useState<AdminRefund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | RefundStatus>('PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  // Modal duyệt / từ chối
  const [action, setAction] = useState<{ type: 'approve' | 'reject'; item: AdminRefund } | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await refundApi.getAll({ status: status || undefined, page, limit });
      setItems(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được danh sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openAction = (type: 'approve' | 'reject', item: AdminRefund) => {
    setNote('');
    setAction({ type, item });
  };

  const submitAction = async () => {
    if (!action) return;
    setSubmitting(true);
    try {
      if (action.type === 'approve') {
        await refundApi.approve(action.item.refundId, note || undefined);
        showToast('Đã duyệt yêu cầu hoàn tiền', 'success');
      } else {
        if (!note.trim()) {
          showToast('Vui lòng nhập lý do từ chối', 'error');
          setSubmitting(false);
          return;
        }
        await refundApi.reject(action.item.refundId, note.trim());
        showToast('Đã từ chối yêu cầu hoàn tiền', 'success');
      }
      setAction(null);
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="Yêu cầu hoàn tiền"
        subtitle={`Tổng ${total} yêu cầu`}
        actions={<Btn onClick={() => void fetchData()}>⟳ Tải lại</Btn>}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_TABS.map((t) => (
          <Btn
            key={t.value || 'all'}
            variant={status === t.value ? 'primary' : 'ghost'}
            onClick={() => {
              setPage(1);
              setStatus(t.value);
            }}
          >
            {t.label}
          </Btn>
        ))}
      </div>

      <ErrorBanner message={error} />

      <TableShell>
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState icon="💸" label="Không có yêu cầu hoàn tiền nào" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase">
              <tr>
                <Th>Mã đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Số tiền</Th>
                <Th>Lý do</Th>
                <Th>Ngày yêu cầu</Th>
                <Th>Trạng thái</Th>
                <Th>Thao tác</Th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {items.map((r) => {
                const meta = STATUS_META[r.refundStatus] ?? {
                  label: r.refundStatus,
                  color: 'gray' as const,
                };
                return (
                  <tr key={r.refundId} className="border-t border-gray-800 hover:bg-gray-800/40">
                    <Td className="font-mono text-white">{r.bookingCode ?? r.bookingId}</Td>
                    <Td>
                      <div className="text-white">{r.customerName ?? '—'}</div>
                      <div className="text-xs text-gray-500">{r.customerEmail ?? ''}</div>
                    </Td>
                    <Td className="font-semibold text-yellow-300">{formatVnd(r.refundAmount)}</Td>
                    <Td className="max-w-xs truncate">{r.reason ?? '—'}</Td>
                    <Td>{formatDateTime(r.requestedAt)}</Td>
                    <Td>
                      <Pill color={meta.color}>{meta.label}</Pill>
                    </Td>
                    <Td>
                      {r.refundStatus === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Btn variant="success" onClick={() => openAction('approve', r)}>
                            Duyệt
                          </Btn>
                          <Btn variant="danger" onClick={() => openAction('reject', r)}>
                            Từ chối
                          </Btn>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {r.completedAt ? formatDateTime(r.completedAt) : 'Đã xử lý'}
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Trước
          </Btn>
          <span className="text-gray-400 text-sm">
            Trang {page}/{totalPages}
          </span>
          <Btn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sau →
          </Btn>
        </div>
      )}

      {action && (
        <Modal
          title={action.type === 'approve' ? 'Duyệt hoàn tiền' : 'Từ chối hoàn tiền'}
          onClose={() => setAction(null)}
          footer={
            <>
              <Btn onClick={() => setAction(null)}>Huỷ</Btn>
              <Btn
                variant={action.type === 'approve' ? 'success' : 'danger'}
                disabled={submitting}
                onClick={() => void submitAction()}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </Btn>
            </>
          }
        >
          <div className="text-sm text-gray-300">
            Đơn <span className="font-mono text-white">{action.item.bookingCode}</span> — số tiền{' '}
            <span className="font-semibold text-yellow-300">
              {formatVnd(action.item.refundAmount)}
            </span>
          </div>
          <Field
            label={
              action.type === 'approve'
                ? 'Mã giao dịch hoàn tiền (tuỳ chọn)'
                : 'Lý do từ chối (bắt buộc)'
            }
          >
            <textarea
              rows={3}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action.type === 'approve' ? 'VD: VNPAY-REF-123456' : 'VD: Đơn đã quá hạn hoàn tiền'
              }
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
