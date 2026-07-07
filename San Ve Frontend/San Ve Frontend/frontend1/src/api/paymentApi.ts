import axiosClient from './axiosClient';

// FIX: Chỉ dùng các method có trong SQL CHECK constraint:
// ('MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK')
// Đã xóa ZALOPAY và CREDIT_CARD vì không có trong SQL → bị CHECK constraint reject
export type PaymentMethodCode = 'CASH' | 'MOMO' | 'VNPAY' | 'BANKING' | 'MOCK';

export interface PaymentMethod {
  code: PaymentMethodCode;
  name: string;
  icon?: string;
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
  const details = (raw.bookingDetails ?? []) as Record<string, unknown>[];
  const seatCodes = details.map((d) => {
    const seat = (d.showtimeSeat as Record<string, unknown>)?.seat as Record<string, unknown> | undefined;
    return seat ? `${seat.rowName ?? ''}${seat.seatNumber ?? ''}` : '';
  }).filter(Boolean);

  const showtime = (raw.showtime ?? details[0]?.showtimeSeat) as Record<string, unknown> | undefined;
  const movie = showtime?.movie as Record<string, unknown> | undefined;

  return {
    id: String(raw.bookingId ?? raw.id ?? ''),
    orderCode: (raw.bookingCode ?? raw.orderCode) as string | undefined,
    movieTitle: (raw.movieTitle ?? movie?.title ?? 'Vé xem phim') as string,
    cinemaName: raw.cinemaName as string | undefined,
    roomName: raw.roomName as string | undefined,
    showDate: raw.showDate as string | undefined,
    showTime: raw.showTime as string | undefined,
    seatCodes,
    totalAmount: Number(raw.totalAmount ?? raw.amount ?? 0),
    status: (raw.status ?? 'PENDING_PAYMENT') as string,
    expiresAt: raw.expiresAt as string | undefined,
  };
}

/** Lấy thông tin booking theo id — gọi GET /bookings/:id */
export async function getOrder(bookingId: string): Promise<OrderDetail> {
  if (!bookingId) throw new Error('Thiếu mã đặt vé');
  const payload = await axiosClient.get(`/bookings/${bookingId}`) as Record<string, unknown>;
  const raw = (payload.data ?? payload) as Record<string, unknown>;
  return normalizeBooking(raw);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const payload = await axiosClient.get('/payment-methods') as Record<string, unknown>;
    const list = Array.isArray(payload) ? payload : (payload.data as unknown[] ?? []);
    return list as PaymentMethod[];
  } catch {
    // Fallback — chỉ dùng các method có trong SQL
    return [
      { code: 'MOMO',    name: 'Ví MoMo' },
      { code: 'VNPAY',   name: 'VNPay' },
      { code: 'BANKING', name: 'Chuyển khoản ngân hàng' },
      { code: 'MOCK',    name: 'Thanh toán giả lập (Dev)' },
      { code: 'CASH',    name: 'Tiền mặt tại quầy' },
    ];
  }
}

export async function payOrder(
  bookingId: string,
  method: PaymentMethodCode,
): Promise<{ redirectUrl?: string; success: boolean; paymentId?: string }> {
  if (!bookingId) throw new Error('Thiếu mã đặt vé');

  // FIX Bước 1: Tạo payment record — POST /payments (trước đây gọi sai tới /payments/process không tồn tại)
  const created = await axiosClient.post(`/payments`, {
    bookingId: Number(bookingId),
    paymentMethod: method,
  }) as Record<string, unknown>;

  const paymentId = String(created.paymentId ?? created.payment_id ?? '');
  if (!paymentId) throw new Error('Không lấy được paymentId');

  // FIX Bước 2: Xác nhận thanh toán — POST /payments/:id/success
  // (Thực tế sẽ là webhook từ cổng thanh toán; ở dev giả lập bằng cách gọi thẳng)
  await axiosClient.post(`/payments/${paymentId}/success`);

  return {
    success: true,
    paymentId,
    redirectUrl: undefined,
  };
}
