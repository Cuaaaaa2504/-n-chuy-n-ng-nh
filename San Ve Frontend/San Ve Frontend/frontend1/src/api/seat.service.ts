// src/api/seat.service.ts
import axiosClient from './axiosClient';
import type { SeatDto, SeatId, SeatStatus } from '../types/seat.types';

/**
 * Chuẩn hoá 1 ghế từ backend về SeatDto.
 *
 * FIX BUG-03: backend nay đã trả về đúng tên `id / rowName / type / status`
 * (xem `showtime-seats/dto/seat-map-response.dto.ts`), nên hàm này chỉ còn vai
 * trò phòng thủ. Các tên cũ (showtimeSeatId / seatRow / seatTypeCode /
 * seatStatus) vẫn được đọc để không vỡ khi FE và BE deploy lệch phiên bản.
 */
export function normalizeSeat(raw: Record<string, unknown>): SeatDto {
  return {
    id:         (raw.id ?? raw.showtimeSeatId ?? raw.seatId) as SeatId,
    rowName:    String(raw.rowName ?? raw.seatRow ?? ''),
    seatNumber: Number(raw.seatNumber ?? 0),
    status:     (raw.status ?? raw.seatStatus ?? 'AVAILABLE') as SeatStatus,
    type:       (raw.type ?? raw.seatTypeCode ?? raw.seatTypeName) as string | undefined,
    price:      raw.price != null ? Number(raw.price) : undefined,
  };
}

interface SeatMapRawResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  /** FIX BUG-02: backend mới trả kèm 2 field này */
  totalSeats?: number;
  seatsGenerated?: boolean;
  seats: Record<string, unknown>[];
}

export interface SeatMapResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  /**
   * FIX BUG-02: false = suất chiếu CÓ THẬT nhưng chưa được sinh ghế.
   * Khác hẳn với việc gọi API thất bại — nhờ vậy frontend hiển thị đúng nguyên nhân.
   */
  seatsGenerated: boolean;
  totalSeats: number;
  seats: SeatDto[];
}

/**
 * FIX BUG-08: `POST /showtime-seats/hold-many` trả về MỘT MẢNG HoldResponseDto[],
 * KHÔNG phải object `{ holdIds }`. Kiểu `HoldSeatsResponse` cũ khai báo sai hoàn
 * toàn — đây chính là lý do SeatBookingPage không dám dùng wrapper mà phải tự gọi
 * axios. Nay wrapper khai báo đúng kiểu thật của backend.
 */
export interface HoldItem {
  /** BIGINT ở DB -> backend trả string, TUYỆT ĐỐI không ép sang Number */
  holdId: string;
  holdToken: string;
  expiresAt: string;
  status: string;
  showtimeSeatId: number;
  seatLabel: string;
  price: number;
}

interface BookSeatsResponse {
  bookingId?: number | string;
  orderCode?: string;
  success: boolean;
  message?: string;
}

export const seatService = {
  /**
   * Lấy sơ đồ ghế theo suất chiếu
   * Backend route: GET /showtime-seats/:showtimeId
   */
  getSeatsByShowtime: async (showtimeId: string | number): Promise<SeatDto[]> => {
    const data = await axiosClient.get<unknown, SeatMapRawResponse>(
      `/showtime-seats/${showtimeId}`,
    );
    return (data.seats ?? []).map(normalizeSeat);
  },

  /**
   * Lấy đầy đủ SeatMapResponse (bao gồm cả movieTitle, roomName...)
   */
  getSeatMap: async (showtimeId: string | number): Promise<SeatMapResponse> => {
    const data = await axiosClient.get<unknown, SeatMapRawResponse>(
      `/showtime-seats/${showtimeId}`,
    );
    const seats = (data.seats ?? []).map(normalizeSeat);
    return {
      ...data,
      seats,
      totalSeats: data.totalSeats ?? seats.length,
      // Backend cũ không có field này -> suy ra từ số ghế thực tế
      seatsGenerated: data.seatsGenerated ?? seats.length > 0,
    };
  },

  /**
   * Hold nhiều ghế cùng lúc — POST /showtime-seats/hold-many
   * Body hợp lệ duy nhất: { showtimeSeatIds: number[], holdMinutes?: number }
   */
  holdSeats: async (seatIds: number[], holdMinutes?: number): Promise<HoldItem[]> => {
    // FIX BUG-01: KHÔNG gửi `showtimeId`.
    // Backend dùng ValidationPipe({ forbidNonWhitelisted: true }) và HoldManySeatsDto
    // chỉ khai báo { showtimeSeatIds, holdMinutes? } -> field thừa sẽ gây HTTP 400.
    const res = await axiosClient.post<unknown, HoldItem[]>(
      `/showtime-seats/hold-many`,
      holdMinutes != null
        ? { showtimeSeatIds: seatIds, holdMinutes }
        : { showtimeSeatIds: seatIds },
    );
    return Array.isArray(res) ? res : [];
  },

  /**
   * Đặt vé (tạo booking) — POST /bookings
   * Nhận holdIds lấy từ kết quả holdSeats(); backend tự suy ra showtimeId.
   */
  bookSeats: async (
    holdIds: string[],
    options?: { voucherCode?: string; promotionId?: number; idempotencyKey?: string },
  ): Promise<BookSeatsResponse> => {
    // FIX BUG-03: CreateBookingRequest chỉ nhận { holdIds, voucherCode?, promotionId?,
    // idempotencyKey?, products? }. Gửi showtimeId/showtimeSeatIds -> 400 forbidNonWhitelisted.
    // Payload này giờ khớp 100% với luồng trong SeatBookingPage.tsx.
    const body: Record<string, unknown> = { holdIds };
    if (options?.voucherCode)    body.voucherCode    = options.voucherCode;
    if (options?.promotionId)    body.promotionId    = options.promotionId;
    if (options?.idempotencyKey) body.idempotencyKey = options.idempotencyKey;

    return axiosClient.post<unknown, BookSeatsResponse>(`/bookings`, body);
  },
};
