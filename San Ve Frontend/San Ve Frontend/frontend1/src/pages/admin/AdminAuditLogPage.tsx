// src/pages/admin/AdminAuditLogPage.tsx
// Xem nhật ký thao tác hệ thống (audit logs)
import { useCallback, useEffect, useState } from 'react';
import { auditLogApi } from '../../api/adminApi';
import type { AuditLog } from '../../types/admin';
import {
  Btn,
  EmptyState,
  ErrorBanner,
  Loading,
  Modal,
  PageHeader,
  Pill,
  TableShell,
  Td,
  Th,
  formatDateTime,
  inputClass,
} from '../../components/admin/AdminUI';

const LIMIT = 20;

/** Tô màu theo loại hành động để dễ quét mắt */
function actionColor(action: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' {
  const a = (action || '').toUpperCase();
  if (a.includes('CREATE') || a.includes('LOGIN') || a.includes('ADD')) return 'green';
  if (a.includes('DELETE') || a.includes('CANCEL') || a.includes('REJECT')) return 'red';
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CHANGE')) return 'yellow';
  if (a.includes('REFUND') || a.includes('PAY')) return 'blue';
  return 'gray';
}

/** Định dạng JSON lưu dạng chuỗi cho dễ đọc */
function prettyJson(value: string | null) {
  if (!value) return '—';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function AdminAuditLogPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogApi.getAll(page, LIMIT);
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Lọc phía client trên trang hiện tại
  const filtered = keyword.trim()
    ? items.filter((l) => {
        const k = keyword.trim().toLowerCase();
        return (
          l.action?.toLowerCase().includes(k) ||
          (l.entityType ?? '').toLowerCase().includes(k) ||
          (l.entityId ?? '').toLowerCase().includes(k) ||
          String(l.userId ?? '').includes(k)
        );
      })
    : items;

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        subtitle="Lịch sử thao tác của người dùng và admin"
        actions={<Btn onClick={() => void fetchData()}>⟳ Tải lại</Btn>}
      />

      <div className="mb-5 max-w-sm">
        <input
          className={inputClass}
          placeholder="Tìm theo hành động, đối tượng, user ID..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <ErrorBanner message={error} />

      <TableShell>
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" label="Chưa có nhật ký nào" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase">
              <tr>
                <Th>Thời gian</Th>
                <Th>User ID</Th>
                <Th>Hành động</Th>
                <Th>Đối tượng</Th>
                <Th>IP</Th>
                <Th>Chi tiết</Th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {filtered.map((l) => (
                <tr key={l.auditId} className="border-t border-gray-800 hover:bg-gray-800/40">
                  <Td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
                  <Td>{l.userId ?? '—'}</Td>
                  <Td>
                    <Pill color={actionColor(l.action)}>{l.action}</Pill>
                  </Td>
                  <Td>
                    <span className="text-white">{l.entityType ?? '—'}</span>
                    {l.entityId && (
                      <span className="text-xs text-gray-500 ml-1">#{l.entityId}</span>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{l.ipAddress ?? '—'}</Td>
                  <Td>
                    <Btn onClick={() => setDetail(l)}>Xem</Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      <div className="flex items-center justify-center gap-3 mt-5">
        <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Trước
        </Btn>
        <span className="text-gray-400 text-sm">Trang {page}</span>
        <Btn disabled={items.length < LIMIT} onClick={() => setPage((p) => p + 1)}>
          Sau →
        </Btn>
      </div>

      {detail && (
        <Modal
          title={`Chi tiết nhật ký #${detail.auditId}`}
          onClose={() => setDetail(null)}
          footer={<Btn onClick={() => setDetail(null)}>Đóng</Btn>}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Thời gian" value={formatDateTime(detail.createdAt)} />
            <InfoRow label="User ID" value={String(detail.userId ?? '—')} />
            <InfoRow label="Hành động" value={detail.action} />
            <InfoRow label="Đối tượng" value={`${detail.entityType ?? '—'} ${detail.entityId ?? ''}`} />
            <InfoRow label="Địa chỉ IP" value={detail.ipAddress ?? '—'} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-1">Giá trị cũ</div>
            <pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-x-auto max-h-40">
              {prettyJson(detail.oldValues)}
            </pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-1">Giá trị mới</div>
            <pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-x-auto max-h-40">
              {prettyJson(detail.newValues)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}
