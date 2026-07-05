// src/api/paymentService.ts

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const paymentService = {
  async getBooking(bookingId: number) {
    const { data } = await axios.get(`${BASE}/bookings/${bookingId}`);
    return data;
  },

  async processPayment(paymentData: { bookingId: number; totalAmount: number }) {
    const { data } = await axios.post(`${BASE}/payments`, paymentData);
    return data;
  },
};
