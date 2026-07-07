// src/api/seat.service.ts
import axiosClient from './axiosClient';
import type { SeatDto } from '../types/seat.types';

interface SeatMapResponse {
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
    const data = await axiosClient.get<unknown, SeatMapResponse>(
      `/showtime-seats/${showtimeId}`,
    );
    return data.seats;
  },

  /**
   * Lấy đầy đủ SeatMapResponse (bao gồm cả movieTitle, roomName...)
   */
  getSeatMap: async (showtimeId: string | number): Promise<SeatMapResponse> => {
    return axiosClient.get<unknown, SeatMapResponse>(
      `/showtime-seats/${showtimeId}`,
    );
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
