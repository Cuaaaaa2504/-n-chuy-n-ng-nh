// src/api/refundApi.ts
//
// FIX [mục 5.1 + 5.2 của báo cáo] — file này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// `MyBookingsPage.handleCancel()` chỉ gọi `cancelBooking()` rồi reload danh
// sách. Với đơn CHƯA thanh toán thì đúng — không có tiền nào để trả lại. Nhưng
// hệ thống không hề có đường nào để yêu cầu hoàn tiền cho đơn ĐÃ thanh toán:
// user mất tiền, và bảng `refunds` vĩnh viễn rỗng.
//
// ⚠️ Body của POST /refunds đã đổi so với code backend cũ. Trước đây controller
// nhận `Partial<Refund>` nên client phải (và CÓ THỂ) tự gửi paymentId +
// refundAmount + refundStatus — đó chính là lỗ hổng cho phép tự duyệt hoàn tiền
// cho đơn của người khác. Nay backend chỉ nhận { bookingId, reason? } và tự tra
// số tiền từ bảng `payments`.

import axiosClient from './axiosClient';

export type RefundStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Refund {
  refundId: string;
  bookingId: string;
  paymentId: string;
  refundAmount: number;
  reason: string | null;
  refundStatus: RefundStatus;
  requestedAt: string;
  completedAt: string | null;
}

/** Nhãn tiếng Việt dùng chung cho mọi nơi hiển thị trạng thái hoàn tiền. */
export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  PENDING: '⏳ Đang chờ duyệt hoàn tiền',
  SUCCESS: '💸 Đã hoàn tiền',
  FAILED:  '❌ Yêu cầu hoàn tiền bị từ chối',
};

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

function normalize(item: Record<string, unknown>): Refund {
  return {
    ...(item as unknown as Refund),
    refundId: String(item.refundId ?? ''),
    bookingId: String(item.bookingId ?? ''),
    refundAmount: Number(item.refundAmount ?? 0),
    refundStatus: (item.refundStatus ?? 'PENDING') as RefundStatus,
  };
}

/** POST /refunds — tạo yêu cầu hoàn tiền cho một đơn của chính mình. */
export async function requestRefund(
  bookingId: string,
  reason?: string,
): Promise<Refund> {
  if (!bookingId) throw new Error('Thiếu mã đơn hàng');
  try {
    const data = (await axiosClient.post('/refunds', {
      bookingId: String(bookingId),
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    })) as unknown as Record<string, unknown>;
    return normalize(data);
  } catch (err) {
    throw new Error(readErrorMessage(err, 'Không gửi được yêu cầu hoàn tiền'), { cause: err });
  }
}

/**
 * GET /refunds/booking/:bookingId — trạng thái hoàn tiền của một đơn.
 *
 * Trả về [] thay vì ném lỗi khi không tra được: đây là thông tin PHỤ hiển thị
 * kèm thẻ đơn hàng, không đáng để làm hỏng cả trang "Vé của tôi" nếu API lỗi.
 */
export async function getRefundsByBooking(bookingId: string): Promise<Refund[]> {
  if (!bookingId) return [];
  try {
    const payload = (await axiosClient.get(
      `/refunds/booking/${bookingId}`,
    )) as unknown as Record<string, unknown>;
    const rows = Array.isArray(payload)
      ? payload
      : ((payload.data as unknown[]) ?? []);
    return (rows as Record<string, unknown>[]).map(normalize);
  } catch {
    return [];
  }
}

export default { requestRefund, getRefundsByBooking, REFUND_STATUS_LABEL };
