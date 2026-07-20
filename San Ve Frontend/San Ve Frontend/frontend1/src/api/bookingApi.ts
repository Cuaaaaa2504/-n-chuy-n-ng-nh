import axiosClient from './axiosClient';
import type { Booking, BookingTicket } from '../types/booking';

function normalizeBooking(item: Record<string, unknown>): Booking {
  // FIX [bookingId must be a UUID]: `id` trước đây fallback sang `orderCode`
  // (mã hiển thị BK-xxx). MyBookingsPage dựng link /payment/${booking.id}, nên khi
  // fallback này chạy thì trang thanh toán nhận được BK-xxx và POST /payments bị
  // ValidationPipe chặn. `id` chỉ được phép là booking_id (BIGINT) — mã hiển thị
  // đưa hết về `orderCode`.
  return {
    ...(item as unknown as Booking),
    id: String(item.bookingId ?? item.booking_id ?? item.id ?? ''),
    orderCode: (item.orderCode ?? item.bookingCode ?? item.booking_code) as string | undefined,
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

// FIX [M-14]: thêm try/catch thống nhất cho tất cả hàm trong bookingApi
export async function getMyBookings(params: { page: number; limit: number }) {
  try {
    const payload = await axiosClient.get('/bookings/my', { params }) as Record<string, unknown>;
    const rawItems = Array.isArray(payload)
      ? payload
      : ((payload.data as unknown[]) ?? (payload.items as unknown[]) ?? []);
    const items = (rawItems as Record<string, unknown>[]).map(normalizeBooking);
    const total = (
      payload.total ??
      (payload.data as Record<string, unknown>)?.total ??
      items.length
    ) as number;
    return { items, total };
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Không tải được danh sách booking';
    throw new Error(msg, { cause: err });
  }
}

export async function getBookingTickets(bookingId: string): Promise<BookingTicket[]> {
  if (!bookingId) throw new Error('Thiếu mã booking');
  try {
    // FIX: route đúng là GET /bookings/:id/tickets (đã thêm route trong booking.controller.ts)
    const payload = await axiosClient.get(`/bookings/${bookingId}/tickets`) as Record<string, unknown>;
    const rawItems = Array.isArray(payload)
      ? payload
      : ((payload.data as unknown[]) ?? (payload.items as unknown[]) ?? []);
    return (rawItems as Record<string, unknown>[]).map(normalizeTicket);
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Không tải được vé';
    throw new Error(msg, { cause: err });
  }
}

export async function cancelBooking(bookingId: string) {
  if (!bookingId) throw new Error('Thiếu mã booking');
  try {
    // FIX: backend dùng DELETE /bookings/:id (không có route POST /bookings/:id/cancel)
    return await axiosClient.delete(`/bookings/${bookingId}`);
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Không hủy được booking';
    throw new Error(msg, { cause: err });
  }
}
