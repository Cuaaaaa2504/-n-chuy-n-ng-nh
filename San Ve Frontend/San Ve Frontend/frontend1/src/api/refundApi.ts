
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
