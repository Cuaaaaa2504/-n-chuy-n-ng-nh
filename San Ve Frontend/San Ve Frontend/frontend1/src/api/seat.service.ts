// src/api/seat.service.ts
import axiosClient from './axiosClient';
import type { SeatDto, SeatId, SeatStatus } from '../types/seat.types';

/**
 * Chuẩn hoá 1 ghế từ backend về SeatDto.
 * Backend (GET /showtime-seats/:id) trả field:
 *   showtimeSeatId, seatRow, seatNumber, seatTypeCode, seatStatus, price
 * còn SeatDto cần: id, rowName, seatNumber, type, status, price.
 * Có fallback sang tên camelCase FE để tương thích cả mock/dữ liệu đã chuẩn hoá.
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
  seats: Record<string, unknown>[];
}

export interface SeatMapResponse {
  showtimeId: number;
  movieTitle: string | null;
  cinemaName: string | null;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  seats: SeatDto[];
}

interface HoldSeatsResponse {
  success: boolean;
  /** Danh sách seat_hold_id do backend trả về — dùng làm input cho bookSeats() */
  holdIds?: number[];
  expiresAt?: string;
  message?: string;
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
    return { ...data, seats: (data.seats ?? []).map(normalizeSeat) };
  },

  /**
   * Hold nhiều ghế cùng lúc — POST /showtime-seats/hold-many
   * Body hợp lệ duy nhất: { showtimeSeatIds: number[], holdMinutes?: number }
   */
  holdSeats: async (
    seatIds: number[],
    holdMinutes?: number,
  ): Promise<HoldSeatsResponse> => {
    // FIX BUG-01: KHÔNG gửi `showtimeId`.
    // Backend dùng ValidationPipe({ forbidNonWhitelisted: true }) và HoldManySeatsDto
    // chỉ khai báo { showtimeSeatIds, holdMinutes? } -> field thừa sẽ gây HTTP 400.
    return axiosClient.post<unknown, HoldSeatsResponse>(
      `/showtime-seats/hold-many`,
      holdMinutes != null
        ? { showtimeSeatIds: seatIds, holdMinutes }
        : { showtimeSeatIds: seatIds },
    );
  },

  /**
   * Đặt vé (tạo booking) — POST /bookings
   * Nhận holdIds lấy từ kết quả holdSeats(); backend tự suy ra showtimeId.
   */
  bookSeats: async (
    holdIds: number[],
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
