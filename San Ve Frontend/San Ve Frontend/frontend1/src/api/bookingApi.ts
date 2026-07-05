import axiosClient from './axiosClient';
import type { Booking, BookingTicket } from '../types/booking';

function normalizeBooking(item: Record<string, unknown>): Booking {
  return {
    ...(item as unknown as Booking),
    id: String(item.id ?? item.bookingId ?? item.orderCode ?? ''),
    orderCode: item.orderCode as string | undefined,
    movieTitle: (item.movieTitle ?? (item.movie as Record<string, unknown>)?.title ?? 'Booking xem phim') as string,
    totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
  };
}

function normalizeTicket(item: Record<string, unknown>): BookingTicket {
  return {
    ...(item as unknown as BookingTicket),
    id: (item.id ?? item.ticketId ?? item.code ?? item.qrCode ?? '') as string,
    ticketId: (item.ticketId ?? item.id) as number | string | undefined,
    movieTitle: (item.movieTitle ?? (item.movie as Record<string, unknown>)?.title ?? 'Vé xem phim') as string,
    seatCode: (item.seatCode ?? item.seatName) as string | undefined,
    seatName: (item.seatName ?? item.seatCode) as string | undefined,
    qrUrl: (item.qrUrl ?? item.qrCodeUrl ?? item.qrCode) as string | undefined,
  };
}

export async function getMyBookings(params: { page: number; limit: number }) {
  const payload = await axiosClient.get('/bookings/my', { params }) as Record<string, unknown>;
  const rawItems = Array.isArray(payload) ? payload : (payload.data as unknown[] || payload.items as unknown[] || []);
  const items = (rawItems as Record<string, unknown>[]).map(normalizeBooking);
  const total = (payload.total ?? (payload.data as Record<string, unknown>)?.total ?? items.length) as number;
  return { items, total };
}

export async function getBookingTickets(bookingId: string): Promise<BookingTicket[]> {
  if (!bookingId) throw new Error('Thiếu mã booking');
  const payload = await axiosClient.get(`/bookings/${bookingId}/tickets`) as Record<string, unknown>;
  const rawItems = Array.isArray(payload) ? payload : (payload.data as unknown[] || payload.items as unknown[] || []);
  return (rawItems as Record<string, unknown>[]).map(normalizeTicket);
}

export async function cancelBooking(bookingId: string) {
  if (!bookingId) throw new Error('Thiếu mã booking');
  return axiosClient.post(`/bookings/${bookingId}/cancel`);
}
