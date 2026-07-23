// src/api/voucherApi.ts
//
// FIX [mục 4.1 + 4.2 của báo cáo] — file này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// Backend đã có sẵn `GET /vouchers/validate` và `GET /vouchers/:code` từ lâu,
// nhưng không có bất kỳ dòng code frontend nào gọi tới. Hệ quả dây chuyền:
//   - Không có ô nhập mã ở bất kỳ bước nào trong luồng đặt vé.
//   - `ComboPage` gửi POST /bookings mà không kèm `voucherCode`.
//   - Backend `BookingService` có đủ logic tính giảm giá... và không bao giờ
//     được kích hoạt. Admin tạo voucher hợp lệ nhưng không ai dùng được.
//
// LƯU Ý QUAN TRỌNG về `/vouchers/validate`:
// Backend ném BadRequestException khi voucher không hợp lệ (hết hạn, chưa tới
// hạn, hết lượt, chưa đạt đơn tối thiểu) và NotFoundException khi sai mã.
// Nghĩa là "voucher không dùng được" đến FE dưới dạng HTTP 4xx, KHÔNG phải
// dạng { valid: false }. Vì vậy hàm dưới đây bắt lỗi và quy về một kiểu kết
// quả thống nhất, để UI không phải viết try/catch rải rác.

import axiosClient from './axiosClient';

export interface VoucherPreview {
  voucherId: number;
  code: string;
  discountType: string;
  discountValue: number;
  /** Số tiền được giảm, đã tính sẵn theo orderAmount gửi lên */
  discountAmount: number;
}

export type VoucherCheckResult =
  | { ok: true; data: VoucherPreview }
  | { ok: false; message: string };

/** Đọc message lỗi từ mọi kiểu reject có thể gặp (axiosClient / axios thô). */
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

/**
 * GET /vouchers/validate?code=&amount=
 *
 * `amount` là tổng tiền đơn hàng TRƯỚC giảm giá (tiền vé + bắp nước).
 * Backend cần con số này để kiểm tra `minOrderAmount` và để tính giảm giá
 * theo phần trăm — gửi thiếu sẽ ra kết quả sai lệch so với lúc đặt vé thật.
 */
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

/**
 * GET /vouchers/:code — xem thông tin voucher mà KHÔNG kiểm tra điều kiện đơn.
 * Dùng cho màn "voucher của tôi" / xem trước ưu đãi.
 */
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
