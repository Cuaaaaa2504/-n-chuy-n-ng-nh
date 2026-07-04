import { useState } from 'react';
import { bookingService } from '../services/bookingService';

export const useBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookings = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Mock data - Replace with actual API call
      const mockData = [
        {
          bookingId: 1001,
          bookingCode: 'BK20260624001',
          customerName: 'Nguyen Van A',
          movieTitle: 'Avengers Endgame',
          showtime: '2026-06-25 19:30',
          seats: ['A1', 'A2'],
          totalAmount: 180000,
          paymentStatus: 'PAID'
        },
        {
          bookingId: 1002,
          bookingCode: 'BK20260624002',
          customerName: 'Tran Thi B',
          movieTitle: 'Avatar 2',
          showtime: '2026-06-26 20:00',
          seats: ['B3', 'B4', 'B5'],
          totalAmount: 270000,
          paymentStatus: 'PENDING'
        }
      ];
      setBookings(mockData);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    loading,
    error,
    fetchBookings
  };
};