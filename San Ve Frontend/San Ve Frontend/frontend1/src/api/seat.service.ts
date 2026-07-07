// src/api/seat.service.ts
// ✅ Sử dụng axiosClient (có baseURL + auth interceptor)
// ✅ URL đúng: /showtime-seats/:showtimeId  (backend: ShowtimeSeatsController @Get(':showtimeId'))

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
    // axiosClient interceptor trả về response.data trực tiếp
    return data.seats;
  },

  /**
   * Lấy đầy đủ SeatMapResponse (bao gồm cả movieTitle, roomName...)
   * Dùng cho trang booking cần hiển thị thông tin suất chiếu
   */
  getSeatMap: async (showtimeId: string | number): Promise<SeatMapResponse> => {
    return axiosClient.get<unknown, SeatMapResponse>(
      `/showtime-seats/${showtimeId}`,
    );
  },

  holdSeats: async (
    showtimeId: string | number,
    seatIds: number[],
  ): Promise<HoldSeatsResponse> => {
    return axiosClient.post<unknown, HoldSeatsResponse>(
      `/showtime-seats/hold`,
      // Backend: @Post('hold') nhận HoldSeatDto { showtimeSeatId, holdMinutes? }
      // Nếu cần hold nhiều ghế: POST /showtime-seats/hold-many
      { showtimeSeatIds: seatIds, showtimeId },
    );
  },

  bookSeats: async (
    showtimeId: string | number,
    seatIds: number[],
  ): Promise<BookSeatsResponse> => {
    return axiosClient.post<unknown, BookSeatsResponse>(
      `/showtime-seats/book`,
      { showtimeSeatIds: seatIds, showtimeId },
    );
  },
};
