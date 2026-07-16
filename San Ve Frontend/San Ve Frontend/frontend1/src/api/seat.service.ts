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
   * Hold nhiều ghế cùng lúc
   * FIX: gọi POST /showtime-seats/hold-many (không phải /hold)
   * vì backend /hold chỉ nhận 1 ghế (HoldSeatDto), còn /hold-many nhận array (HoldManySeatsDto)
   */
  holdSeats: async (
    showtimeId: string | number,
    seatIds: number[],
  ): Promise<HoldSeatsResponse> => {
    return axiosClient.post<unknown, HoldSeatsResponse>(
      `/showtime-seats/hold-many`,
      { showtimeSeatIds: seatIds, showtimeId },
    );
  },

  /**
   * Đặt vé (tạo booking)
   * Route: POST /bookings (không phải /showtime-seats/book)
   */
  bookSeats: async (
    showtimeId: string | number,
    seatIds: number[],
  ): Promise<BookSeatsResponse> => {
    return axiosClient.post<unknown, BookSeatsResponse>(
      `/bookings`,
      { showtimeId, showtimeSeatIds: seatIds },
    );
  },
};
