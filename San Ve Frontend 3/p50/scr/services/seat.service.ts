// src/services/seat.service.ts

import { SeatDto } from '../types/seat.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export const seatService = {
  getSeatsByShowtime: async (showtimeId: string | number): Promise<SeatDto[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/showtimes/${showtimeId}/seats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching seats:', error);
      throw error;
    }
  },

  holdSeats: async (showtimeId: string | number, seatIds: number[]): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/showtimes/${showtimeId}/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seatIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error holding seats:', error);
      throw error;
    }
  },

  bookSeats: async (showtimeId: string | number, seatIds: number[]): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/showtimes/${showtimeId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seatIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error booking seats:', error);
      throw error;
    }
  }
};