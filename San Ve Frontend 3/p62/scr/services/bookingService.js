import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

export const bookingService = {
  // GET /api/admin/bookings
  getAll: async (filters = {}) => {
    try {
      // const response = await axios.get(`${API_BASE_URL}/admin/bookings`, {
      //   params: filters,
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      // return response.data;
      
      // Mock data for development
      return [
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
    } catch (error) {
      throw error;
    }
  }
};