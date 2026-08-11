import axiosClient from './axiosClient';
import { normalizeBookingCore } from './bookingNormalizer';

export type PaymentMethodCode = 'CASH' | 'MOMO' | 'VNPAY' | 'BANKING' | 'MOCK';

export interface PaymentMethod {
  code: PaymentMethodCode;
  name: string;
  icon?: string;
  enabled?: boolean;
  note?: string;
}

export interface OrderDetail {
  id: string | number;
  orderCode?: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  seatCodes?: string[];
  totalAmount: number;
  status: string;
  expiresAt?: string;
}

function normalizeBooking(raw: Record<string, unknown>): OrderDetail {
  return normalizeBookingCore(raw, { strictNumericId: true });
}

export async function getOrder(bookingId: string): Promise<OrderDetail> {
  if (!bookingId) throw new Error('Thiếu mã đặt vé');
  const raw = await axiosClient.get(`/bookings/${bookingId}`) as unknown as Record<string, unknown>;
  return normalizeBooking(raw);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const payload = await axiosClient.get('/payments/methods') as unknown;
    const list = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>).data as unknown[] ?? []);
    return list as PaymentMethod[];
  } catch {
    return [
      { code: 'MOMO', name: 'Ví MoMo', enabled: false, note: 'Chưa cấu hình cổng MoMo' },
      { code: 'VNPAY', name: 'VNPay', enabled: false, note: 'Chưa cấu hình cổng VNPay' },
      { code: 'BANKING', name: 'Chuyển khoản ngân hàng', enabled: true, note: 'Tạo giao dịch chờ STAFF/ADMIN xác nhận' },
      {
        code: 'MOCK',
        name: 'Thanh toán giả lập (Dev)',
        enabled: false,
        note: 'Không xác minh được chế độ DEV vì backend không phản hồi',
      },
      { code: 'CASH', name: 'Tiền mặt tại quầy', enabled: true },
    ];
  }
}

export async function payOrder(
  bookingId: string,
  method: PaymentMethodCode,
): Promise<{
  redirectUrl?: string;
  success: boolean;
  paymentId?: string;
  transactionCode?: string;
  status: 'PENDING' | 'SUCCESS';
}> {
  if (!bookingId) throw new Error('Thiếu mã đặt vé');

  if (!/^\d+$/.test(bookingId)) {
    throw new Error(
      `Mã đơn hàng không hợp lệ (${bookingId}). Vui lòng quay lại và đặt vé lại.`,
    );
  }

  const created = await axiosClient.post(`/payments`, {
    bookingId,
    paymentMethod: method,
  }) as unknown as Record<string, unknown>;

  const paymentId = String(created.paymentId ?? created.payment_id ?? '');
  if (!paymentId) throw new Error('Không lấy được paymentId từ backend');

  const transactionCode = String(
    created.transactionCode ?? created.transaction_code ?? '',
  );

  if (!AUTO_CONFIRM_METHODS.includes(method)) {
    return {
      success: true,
      status: 'PENDING',
      paymentId,
      transactionCode,
      redirectUrl: (created.redirectUrl ?? created.payUrl) as string | undefined,
    };
  }

  await confirmPayment(paymentId, bookingId);

  return {
    success: true,
    status: 'SUCCESS',
    paymentId,
    transactionCode,
    redirectUrl: undefined,
  };
}

const AUTO_CONFIRM_METHODS: PaymentMethodCode[] = ['MOCK'];

async function confirmPayment(paymentId: string, bookingId: string): Promise<void> {
  try {
    await axiosClient.post(`/payments/${paymentId}/success`);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const alreadyProcessed =
      e.status === 400 && /PENDING/i.test(e.message ?? '');

    if (!alreadyProcessed) {
      throw new Error(e.message || 'Xác nhận thanh toán thất bại', { cause: err });
    }
    const status = await getPaymentStatus(bookingId);
    if (status !== 'SUCCESS') {
      throw new Error(
        `Thanh toán không thành công (trạng thái: ${status ?? 'không xác định'})`,
        { cause: err },
      );
    }
  }
}

async function getPaymentStatus(bookingId: string): Promise<string | null> {
  try {
    const p = (await axiosClient.get(
      `/payments/booking/${bookingId}`,
    )) as unknown as Record<string, unknown>;
    return (p.paymentStatus ?? p.payment_status ?? null) as string | null;
  } catch {
    return null;
  }
}
