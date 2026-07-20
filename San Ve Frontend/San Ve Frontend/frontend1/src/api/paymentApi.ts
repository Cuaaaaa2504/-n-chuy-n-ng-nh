import axiosClient from './axiosClient';

// Chỉ dùng các method có trong SQL CHECK constraint:
// ('MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK')
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

  const rawExpiresAt = raw.expiresAt ?? raw.expires_at;
  const expiresAt: string | undefined =
    typeof rawExpiresAt === 'string' ? rawExpiresAt : undefined;

  // FIX [bookingId must be a UUID]: `id` PHẢI là khoá chính booking_id (BIGINT,
  // ví dụ "1042") — KHÔNG bao giờ là bookingCode "BK-1784554863343-ZPJ6".
  // bookingCode chỉ dùng để hiển thị và nằm ở trường `orderCode`.
  const resolvedId = String(raw.bookingId ?? raw.booking_id ?? raw.id ?? '').trim();
  if (resolvedId && !/^\d+$/.test(resolvedId)) {
    throw new Error('Dữ liệu đơn hàng không hợp lệ: máy chủ không trả về bookingId dạng số');
  }

  return {
    id: resolvedId,
    orderCode: (raw.bookingCode ?? raw.booking_code ?? raw.orderCode) as string | undefined,
    movieTitle: (raw.movieTitle ?? movie?.title ?? 'Vé xem phim') as string,
    cinemaName: raw.cinemaName as string | undefined,
    roomName: raw.roomName as string | undefined,
    showDate: raw.showDate as string | undefined,
    showTime: raw.showTime as string | undefined,
    seatCodes,
    totalAmount: Number(raw.totalAmount ?? raw.total_amount ?? raw.amount ?? 0),
    status: (raw.status ?? 'PENDING_PAYMENT') as string,
    expiresAt,
  };
}

/** Lấy thông tin booking theo id — gọi GET /bookings/:id */
export async function getOrder(bookingId: string): Promise<OrderDetail> {
  if (!bookingId) throw new Error('Thiếu mã đặt vé');
  // axiosClient đã unwrap response.data — dùng trực tiếp
  const raw = await axiosClient.get(`/bookings/${bookingId}`) as unknown as Record<string, unknown>;
  return normalizeBooking(raw);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    // FIX: backend expose GET /payments/methods (xem PaymentController), không phải
    // /payment-methods — request cũ luôn 404 rồi im lặng rơi vào danh sách fallback.
    const payload = await axiosClient.get('/payments/methods') as unknown;
    const list = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>).data as unknown[] ?? []);
    return list as PaymentMethod[];
  } catch {
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

  // FIX [bookingId must be a UUID]: chặn ngay tại client nếu lỡ truyền bookingCode
  // (BK-xxx) thay vì booking_id. Trước đây chuỗi này đi thẳng xuống backend và bị
  // ValidationPipe trả về 400 "bookingId must be a UUID" — thông báo hoàn toàn
  // vô nghĩa với người dùng lẫn lập trình viên.
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

  // FIX BUG-04: chỉ auto-confirm với các phương thức thanh toán nội bộ (MOCK/CASH).
  // MOMO/VNPAY/BANKING phải để cổng thanh toán callback về backend, FE tự gọi
  // /success sẽ đánh dấu SUCCESS cho giao dịch chưa thực sự thanh toán.
  if (!AUTO_CONFIRM_METHODS.includes(method)) {
    return {
      success: true,
      paymentId,
      redirectUrl: (created.redirectUrl ?? created.payUrl) as string | undefined,
    };
  }

  await confirmPayment(paymentId, bookingId);

  return {
    success: true,
    paymentId,
    redirectUrl: undefined,
  };
}

/** Các phương thức backend tự xử lý ngay, không qua cổng thanh toán ngoài. */
const AUTO_CONFIRM_METHODS: PaymentMethodCode[] = ['MOCK', 'CASH'];

/**
 * FIX BUG-04: gọi /payments/:id/success một cách idempotent.
 * Nếu payment đã ở trạng thái SUCCESS (user bấm lại / retry mạng), backend ném
 * BadRequestException "chỉ PENDING mới được xử lý" — đây KHÔNG phải lỗi với người
 * dùng, vé đã được tạo rồi. Ta xác minh lại trạng thái thật rồi mới quyết định.
 */
async function confirmPayment(paymentId: string, bookingId: string): Promise<void> {
  try {
    await axiosClient.post(`/payments/${paymentId}/success`);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const alreadyProcessed =
      e.status === 400 && /PENDING/i.test(e.message ?? '');

    if (!alreadyProcessed) {
      throw new Error(e.message || 'Xác nhận thanh toán thất bại');
    }
    // Payment không còn PENDING: có thể đã SUCCESS (ok) hoặc FAILED (không ok).
    // Không nuốt lỗi mù quáng — kiểm tra lại trạng thái thực tế.
    const status = await getPaymentStatus(bookingId);
    if (status !== 'SUCCESS') {
      throw new Error(
        `Thanh toán không thành công (trạng thái: ${status ?? 'không xác định'})`,
      );
    }
  }
}

/**
 * Đọc lại trạng thái payment để xác minh sau khi retry.
 * Backend chỉ expose GET /payments/booking/:bookingId (trả payment mới nhất),
 * không có GET /payments/:id — nên tra theo bookingId.
 */
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
