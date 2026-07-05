// src/api/seat.service.ts

import axios from 'axios';
import type { SeatDto } from '../types/seat.types'; // ✅ thêm type

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ✅ Định nghĩa response types thay cho any
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
  getSeatsByShowtime: async (showtimeId: string | number): Promise<SeatDto[]> => {
    const { data } = await axios.get<SeatDto[]>(`${BASE}/api/showtimes/${showtimeId}/seats`);
    return data;
  },

  holdSeats: async (showtimeId: string | number, seatIds: number[]): Promise<HoldSeatsResponse> => { // ✅ thay any
    const { data } = await axios.post<HoldSeatsResponse>(`${BASE}/api/showtimes/${showtimeId}/hold`, { seatIds });
    return data;
  },

  bookSeats: async (showtimeId: string | number, seatIds: number[]): Promise<BookSeatsResponse> => { // ✅ thay any
    const { data } = await axios.post<BookSeatsResponse>(`${BASE}/api/showtimes/${showtimeId}/book`, { seatIds });
    return data;
  },
};
