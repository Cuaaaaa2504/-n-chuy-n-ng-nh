import axiosClient from './axiosClient';
import type { Booking, BookingTicket } from '../types/booking';
import { normalizeBookingCore } from './bookingNormalizer';

// FIX [mục 9.1]: thân hàm cũ đã chuyển sang `bookingNormalizer.ts` — nguồn sự
// thật DUY NHẤT dùng chung với `paymentApi.ts`. Trước đây hai file có hai bản
// normalize riêng và ĐÃ lệch nhau (bản ở paymentApi đọc sai quan hệ lồng nhau,
// nên PaymentPage mất tên rạp / phòng / giờ chiếu). Giữ wrapper mỏng ở đây để
// ghép thêm các field riêng của type `Booking`.
function normalizeBooking(item: Record<string, unknown>): Booking {
  const core = normalizeBookingCore(item);
  return {
    ...(item as unknown as Booking),
    ...core,
    status: core.status as Booking['status'],
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
