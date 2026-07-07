// src/api/paymentService.ts
import axiosClient from './axiosClient';

export const paymentService = {
  async getBooking(bookingId: number) {
    return axiosClient.get(`/bookings/${bookingId}`);
  },

  async processPayment(paymentData: { bookingId: number; totalAmount: number }) {
    return axiosClient.post(`/payments`, paymentData);
  },
};
