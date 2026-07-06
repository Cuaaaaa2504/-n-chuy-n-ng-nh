// src/hooks/useBookings.ts
import { useState } from 'react';

interface Booking {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  movieTitle: string;
  showtime: string;
  seats: string[];
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
}

interface Filters {
  bookingCode?: string;
  customerName?: string;
  movieTitle?: string;
  paymentStatus?: string;
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchBookings = async (filters: Filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Mock data — replace with actual API call
      const mockData: Booking[] = [
        {
          bookingId: 1001,
          bookingCode: 'BK20260624001',
          customerName: 'Nguyen Van A',
          movieTitle: 'Avengers Endgame',
          showtime: '2026-06-25 19:30',
          seats: ['A1', 'A2'],
          totalAmount: 180000,
          paymentStatus: 'PAID',
        },
        {
          bookingId: 1002,
          bookingCode: 'BK20260624002',
          customerName: 'Tran Thi B',
          movieTitle: 'Avatar 2',
          showtime: '2026-06-26 20:00',
          seats: ['B3', 'B4', 'B5'],
          totalAmount: 270000,
          paymentStatus: 'PENDING',
        },
      ];

      // Basic client-side filtering
      let result = mockData;
      if (filters.bookingCode)
        result = result.filter(b => b.bookingCode.includes(filters.bookingCode!));
      if (filters.customerName)
        result = result.filter(b => b.customerName.toLowerCase().includes(filters.customerName!.toLowerCase()));
      if (filters.movieTitle)
        result = result.filter(b => b.movieTitle.toLowerCase().includes(filters.movieTitle!.toLowerCase()));
      if (filters.paymentStatus)
        result = result.filter(b => b.paymentStatus === filters.paymentStatus);

      setBookings(result);
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return { bookings, loading, error, fetchBookings };
};
