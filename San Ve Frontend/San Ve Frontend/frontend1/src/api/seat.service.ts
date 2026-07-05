// src/api/seat.service.ts

import axios from 'axios';
import { SeatDto } from '../types/seat.types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const seatService = {
  getSeatsByShowtime: async (showtimeId: string | number): Promise<SeatDto[]> => {
    const { data } = await axios.get(`${BASE}/api/showtimes/${showtimeId}/seats`);
    return data;
  },

  holdSeats: async (showtimeId: string | number, seatIds: number[]): Promise<any> => {
    const { data } = await axios.post(`${BASE}/api/showtimes/${showtimeId}/hold`, { seatIds });
    return data;
  },

  bookSeats: async (showtimeId: string | number, seatIds: number[]): Promise<any> => {
    const { data } = await axios.post(`${BASE}/api/showtimes/${showtimeId}/book`, { seatIds });
    return data;
  },
};
