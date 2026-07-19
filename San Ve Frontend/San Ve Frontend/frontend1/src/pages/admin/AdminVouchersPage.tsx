// src/pages/admin/AdminVouchersPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { voucherApi } from '../../api/adminApi';
import type { CreateVoucherPayload, Voucher } from '../../types/admin';
import {
  Btn,
  ConfirmModal,
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
  formatDate,
  formatVnd,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';

type FormState = CreateVoucherPayload;

const emptyForm: FormState = {
  code: '',
  promotionName: '',
  discountType: 'PERCENT',
  discountValue: 10,
  minOrderAmount: 0,
  startAt: '',
  endAt: '',
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function AdminVouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Voucher | null>(null);
  const { toast, showToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await voucherApi.getAll(1, 100);
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được danh sách voucher');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (v: Voucher) => {
    setForm({
      code: v.promotionCode,
      promotionName: v.promotionName,
      discountType: v.discountType === 'FIXED' ? 'FIXED' : 'PERCENT',
      discountValue: Number(v.discountValue),
      maxDiscount: v.maxDiscount ?? undefined,
      minOrderAmount: Number(v.minOrderAmount ?? 0),
      startAt: toDateInput(v.startAt),
      endAt: toDateInput(v.endAt),
      usageLimit: v.usageLimit ?? undefined,
      description: v.description ?? undefined,
    });
    setEditing(v);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.promotionName.trim()) {
      showToast('Vui lòng nhập mã và tên chương trình', 'error');
      return;
    }
    if (!form.startAt || !form.endAt) {
      showToast('Vui lòng chọn ngày bắt đầu và kết thúc', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount ?? 0),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };
      if (editing) {
        const { code: _unusedCode, ...rest } = payload;
        await voucherApi.update(editing.promotionId, rest);
        showToast('Đã cập nhật voucher');
      } else {
        await voucherApi.create(payload);
        showToast('Đã tạo voucher mới');
      }
      closeModal();
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Lưu voucher thất bại', 'error');
    }
  };

  const handleToggle = async (v: Voucher) => {
    try {
      await voucherApi.toggle(v.promotionId);
      showToast(v.status === 'ACTIVE' ? 'Đã tắt voucher' : 'Đã bật voucher');
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Đổi trạng thái thất bại', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await voucherApi.remove(confirmDelete.promotionId);
      showToast(res?.message ?? 'Đã xoá voucher');
      await fetchData();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Xoá voucher thất bại', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="Quản lý Voucher"
        subtitle={`Tổng: ${total} voucher`}
        actions={
          <>
            <Btn onClick={() => void fetchData()}>🔄 Làm mới</Btn>
            <Btn variant="primary" onClick={openCreate}>
              + Thêm voucher
            </Btn>
          </>
        }
      />
      <ErrorBanner message={error} />

      <TableShell>
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState icon="🎫" label="Chưa có voucher nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <Th>Mã</Th>
                <Th>Tên chương trình</Th>
                <Th>Giảm giá</Th>
                <Th>Đơn tối thiểu</Th>
                <Th>Hiệu lực</Th>
                <Th>Đã dùng</Th>
                <Th>Trạng thái</Th>
                <Th>Thao tác</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((v) => (
                <tr key={v.promotionId} className="hover:bg-gray-800/50 transition">
                  <Td className="font-mono text-blue-300">{v.promotionCode}</Td>
                  <Td className="text-white">{v.promotionName}</Td>
                  <Td className="text-gray-300">
                    {v.discountType === 'FIXED'
                      ? formatVnd(v.discountValue)
                      : `${Number(v.discountValue)}%`}
                  </Td>
                  <Td className="text-gray-400">{formatVnd(v.minOrderAmount)}</Td>
                  <Td className="text-gray-400">
                    {formatDate(v.startAt)} → {formatDate(v.endAt)}
                  </Td>
                  <Td className="text-gray-400">
                    {v.usedCount}
                    {v.usageLimit ? ` / ${v.usageLimit}` : ''}
                  </Td>
                  <Td>
                    <Pill color={v.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {v.status === 'ACTIVE' ? 'Đang bật' : 'Đã tắt'}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Btn variant="purple" onClick={() => openEdit(v)}>
                        Sửa
                      </Btn>
                      <Btn
                        variant={v.status === 'ACTIVE' ? 'ghost' : 'success'}
                        onClick={() => void handleToggle(v)}
                      >
                        {v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                      </Btn>
                      <Btn variant="danger" onClick={() => setConfirmDelete(v)}>
                        Xoá
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {(creating || editing) && (
        <Modal
          title={editing ? `Sửa voucher ${editing.promotionCode}` : 'Thêm voucher mới'}
          onClose={closeModal}
          footer={
            <>
              <Btn onClick={closeModal}>Huỷ</Btn>
              <Btn variant="primary" onClick={() => void handleSubmit()}>
                Lưu
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã voucher">
              <input
                className={inputClass}
                value={form.code}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2026"
              />
            </Field>
            <Field label="Tên chương trình">
              <input
                className={inputClass}
                value={form.promotionName}
                onChange={(e) => setForm({ ...form, promotionName: e.target.value })}
                placeholder="Khuyến mãi hè"
              />
            </Field>
            <Field label="Loại giảm giá">
              <select
                className={inputClass}
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as 'PERCENT' | 'FIXED' })
                }
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (₫)</option>
              </select>
            </Field>
            <Field label="Giá trị giảm">
              <input
                type="number"
                className={inputClass}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              />
            </Field>
            <Field label="Giảm tối đa (₫)">
              <input
                type="number"
                className={inputClass}
                value={form.maxDiscount ?? ''}
                onChange={(e) =>
                  setForm({ ...form, maxDiscount: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
            <Field label="Đơn tối thiểu (₫)">
              <input
                type="number"
                className={inputClass}
                value={form.minOrderAmount ?? 0}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Bắt đầu">
              <input
                type="date"
                className={inputClass}
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </Field>
            <Field label="Kết thúc">
              <input
                type="date"
                className={inputClass}
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </Field>
            <Field label="Giới hạn lượt dùng">
              <input
                type="number"
                className={inputClass}
                value={form.usageLimit ?? ''}
                onChange={(e) =>
                  setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea
              className={inputClass}
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Xoá voucher "${confirmDelete.promotionCode}"? Voucher đã phát sinh đơn sẽ chỉ bị vô hiệu hoá.`}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
