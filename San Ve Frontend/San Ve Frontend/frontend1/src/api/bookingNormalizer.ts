// src/api/bookingNormalizer.ts
//
// FIX [mục 9.1 của báo cáo — logic phân tán]
//
// Trước đây tồn tại HAI hàm `normalizeBooking` riêng biệt cho cùng một resource:
// một ở `bookingApi.ts` (dùng cho MyBookingsPage) và một ở `paymentApi.ts`
// (dùng cho PaymentPage, qua `getOrder()`).
//
// Báo cáo cảnh báo rằng nếu backend thêm field mới mà chỉ cập nhật một nơi thì
// hai trang sẽ hiển thị khác nhau. Nhưng thực tế còn tệ hơn cảnh báo — hai bản
// ĐÃ lệch nhau sẵn, và bản ở `paymentApi.ts` đang sai ở 2 chỗ:
//
//   1. Nó đọc `raw.cinemaName` / `raw.roomName` / `raw.showDate` / `raw.showTime`
//      như thể backend trả phẳng. Backend KHÔNG trả phẳng — dữ liệu nằm trong
//      quan hệ lồng nhau `showtime -> room -> cinema` (đúng như bản ở
//      `bookingApi.ts` đã xử lý). Hệ quả: PaymentPage luôn thiếu tên rạp,
//      tên phòng và giờ chiếu, trong khi MyBookingsPage hiện đầy đủ.
//
//   2. Nó dựng mã ghế bằng `seat.rowName`. Entity backend đặt tên cột là
//      `seatRow` (cột `seat_row`); `rowName` chỉ là fallback cho dữ liệu cũ.
//      Nên mã ghế trên trang thanh toán dễ ra dạng "5", "12" (mất chữ hàng)
//      thay vì "E5", "C12".
//
// File này là NGUỒN SỰ THẬT DUY NHẤT cho việc đọc một booking từ API. Cả hai
// api module đều gọi vào đây; thêm field mới chỉ cần sửa một chỗ.

/** Các field lõi mà mọi trang hiển thị booking đều cần. */
export interface BookingCore {
  /** LUÔN là booking_id dạng số (BIGINT), không bao giờ là mã BK-xxxx */
  id: string;
  /** Mã hiển thị cho người dùng, dạng BK-xxxx */
  orderCode?: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  seatCodes: string[];
  totalAmount: number;
  status: string;
  expiresAt?: string;
  paidAt?: string;
}

type Raw = Record<string, unknown>;

const asObj = (v: unknown): Raw | undefined =>
  v && typeof v === 'object' ? (v as Raw) : undefined;

/**
 * Dựng mã ghế từ quan hệ `bookingDetails -> showtimeSeat -> seat`.
 *
 * `seatRow` là tên property đúng theo entity (cột `seat_row`); `rowName` giữ
 * làm fallback cho dữ liệu/response cũ. Thiếu fallback này là lý do mã ghế ở
 * trang thanh toán từng bị mất chữ hàng.
 */
export function extractSeatCodes(raw: Raw): string[] {
  const details = (raw.bookingDetails ?? raw.booking_details ?? []) as Raw[];
  if (!Array.isArray(details)) return [];

  return details
    .map((d) => {
      const seat = asObj(asObj(d.showtimeSeat ?? d.showtime_seat)?.seat);
      if (!seat) return '';
      const row = (seat.seatRow ?? seat.rowName ?? seat.seat_row ?? '') as string;
      const num = (seat.seatNumber ?? seat.seat_number ?? '') as string | number;
      return `${row}${num}`;
    })
    .filter(Boolean);
}

export interface NormalizeOptions {
  /**
   * Bật cho luồng THANH TOÁN: ném lỗi nếu server không trả về booking_id dạng
   * số. `POST /payments` bị ValidationPipe chặn nếu nhận bookingCode 'BK-xxx',
   * nên phát hiện sớm ở đây cho ra thông báo rõ ràng thay vì lỗi 400 khó hiểu
   * mãi sau này. Các luồng chỉ-hiển-thị thì không cần chặt như vậy.
   */
  strictNumericId?: boolean;
}

export function normalizeBookingCore(
  raw: Raw,
  options: NormalizeOptions = {},
): BookingCore {
  // Backend trả booking kèm quan hệ lồng nhau: showtime -> movie / room -> cinema.
  const showtime = asObj(raw.showtime);
  const movie = asObj(raw.movie ?? showtime?.movie);
  const room = asObj(showtime?.room ?? raw.room);
  const cinema = asObj(room?.cinema ?? raw.cinema);

  // Showtime chỉ có `startTime` (datetime đầy đủ) — tách ra ngày & giờ.
  const startRaw = (showtime?.startTime ?? showtime?.start_time) as string | undefined;
  const start = startRaw ? new Date(startRaw) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;

  // `id` PHẢI là khoá chính booking_id. Trước đây có chỗ fallback sang
  // `orderCode` khiến trang thanh toán nhận BK-xxx rồi bị backend từ chối.
  const id = String(raw.bookingId ?? raw.booking_id ?? raw.id ?? '').trim();
  if (options.strictNumericId && id && !/^\d+$/.test(id)) {
    throw new Error(
      'Dữ liệu đơn hàng không hợp lệ: máy chủ không trả về bookingId dạng số',
    );
  }

  const expiresAtRaw = raw.expiresAt ?? raw.expires_at;
  const paidAtRaw = raw.paidAt ?? raw.paid_at;

  return {
    id,
    orderCode: (raw.orderCode ?? raw.bookingCode ?? raw.booking_code) as
      | string
      | undefined,
    movieTitle: (raw.movieTitle ?? movie?.title ?? 'Vé xem phim') as string,
    cinemaName: (raw.cinemaName ?? cinema?.cinemaName ?? cinema?.name) as
      | string
      | undefined,
    roomName: (raw.roomName ?? room?.roomName ?? room?.name) as string | undefined,
    showDate: ((raw.showDate as string | undefined) ??
      validStart?.toLocaleDateString('vi-VN')) as string | undefined,
    showTime: ((raw.showTime as string | undefined) ??
      validStart?.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })) as string | undefined,
    seatCodes: extractSeatCodes(raw),
    totalAmount: Number(raw.totalAmount ?? raw.total_amount ?? raw.amount ?? 0),
    status: (raw.status ?? 'PENDING_PAYMENT') as string,
    expiresAt: typeof expiresAtRaw === 'string' ? expiresAtRaw : undefined,
    paidAt: typeof paidAtRaw === 'string' ? paidAtRaw : undefined,
  };
}
