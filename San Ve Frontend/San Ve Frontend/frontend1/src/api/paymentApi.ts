import axiosClient from './axiosClient';
import { normalizeBookingCore } from './bookingNormalizer';

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

// FIX [mục 9.1]: bản normalize riêng của file này đã bị gỡ.
//
// Nó không chỉ trùng lặp mà còn SAI: đọc `raw.cinemaName` / `raw.showDate` như
// thể backend trả phẳng (thực tế nằm trong showtime -> room -> cinema), và dựng
// mã ghế bằng `seat.rowName` trong khi entity dùng `seatRow`. Hệ quả là cùng
// một booking hiển thị đầy đủ ở MyBookingsPage nhưng thiếu tên rạp / phòng /
// giờ chiếu ở PaymentPage — đúng kiểu lệch dữ liệu mà báo cáo cảnh báo.
//
// `strictNumericId` giữ nguyên ràng buộc quan trọng của luồng thanh toán:
// bookingId phải là số, không được là bookingCode 'BK-xxx'.
function normalizeBooking(raw: Record<string, unknown>): OrderDetail {
  return normalizeBookingCore(raw, { strictNumericId: true });
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
      // `cause` giữ lại lỗi gốc để log/debug không mất ngữ cảnh (rule
      // preserve-caught-error) — 2 chỗ dưới đây vốn đã lint-error từ trước.
      throw new Error(e.message || 'Xác nhận thanh toán thất bại', { cause: err });
    }
    // Payment không còn PENDING: có thể đã SUCCESS (ok) hoặc FAILED (không ok).
    // Không nuốt lỗi mù quáng — kiểm tra lại trạng thái thực tế.
    const status = await getPaymentStatus(bookingId);
    if (status !== 'SUCCESS') {
      throw new Error(
        `Thanh toán không thành công (trạng thái: ${status ?? 'không xác định'})`,
        { cause: err },
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
