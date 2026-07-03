import axiosClient from './axiosClient';
import type { Booking, BookingTicket } from '../types/booking';

function normalizeBooking(item: any): Booking {
  return {
    ...item,
    id: String(item.id ?? item.bookingId ?? item.orderCode ?? ''),
    orderCode: item.orderCode,
    movieTitle: item.movieTitle ?? item.movie?.title ?? 'Booking xem phim',
    totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
  };
}

function normalizeTicket(item: any): BookingTicket {
  return {
    ...item,
    id: item.id ?? item.ticketId ?? item.code ?? item.qrCode ?? '',
    ticketId: item.ticketId ?? item.id,
    movieTitle: item.movieTitle ?? item.movie?.title ?? 'Vé xem phim',
    seatCode: item.seatCode ?? item.seatName,
    seatName: item.seatName ?? item.seatCode,
    qrUrl: item.qrUrl ?? item.qrCodeUrl ?? item.qrCode,
  };
}

export async function getMyBookings(params: { page: number; limit: number }) {
  const payload = await axiosClient.get('/bookings/my', { params });
  const rawItems = Array.isArray(payload) ? payload : payload.data || payload.items || [];
  const items = rawItems.map(normalizeBooking);
  const total = payload.total || payload.data?.total || items.length;
  return { items, total };
}

export async function getBookingTickets(bookingId: string) {
  if (!bookingId) throw new Error('Thiếu mã booking');
  const payload = await axiosClient.get(`/bookings/${bookingId}/tickets`);
  const rawItems = Array.isArray(payload) ? payload : payload.data || payload.items || [];
  return rawItems.map(normalizeTicket);
}

export async function cancelBooking(bookingId: string) {
  if (!bookingId) throw new Error('Thiếu mã booking');
  return axiosClient.post(`/bookings/${bookingId}/cancel`);
}
