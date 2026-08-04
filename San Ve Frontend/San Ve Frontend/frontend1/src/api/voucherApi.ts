
import axiosClient from './axiosClient';

export interface VoucherPreview {
  voucherId: number;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
}

export type VoucherCheckResult =
  | { ok: true; data: VoucherPreview }
  | { ok: false; message: string };

function readErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { message?: string | string[] } };
    raw?: { response?: { data?: { message?: string | string[] } } };
  };
  const raw =
    e?.response?.data?.message ??
    e?.raw?.response?.data?.message ??
    e?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return raw ?? fallback;
}

export async function validateVoucher(
  code: string,
  amount: number,
): Promise<VoucherCheckResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, message: 'Vui lòng nhập mã giảm giá' };

  try {
    const data = (await axiosClient.get('/vouchers/validate', {
      params: { code: normalized, amount },
    })) as unknown as VoucherPreview;

    return { ok: true, data: { ...data, discountAmount: Number(data.discountAmount ?? 0) } };
  } catch (err) {
    return { ok: false, message: readErrorMessage(err, 'Mã giảm giá không hợp lệ') };
  }
}

export async function getVoucherByCode(code: string): Promise<VoucherPreview | null> {
  try {
    return (await axiosClient.get(
      `/vouchers/${encodeURIComponent(code.trim().toUpperCase())}`,
    )) as unknown as VoucherPreview;
  } catch {
    return null;
  }
}

export default { validateVoucher, getVoucherByCode };
