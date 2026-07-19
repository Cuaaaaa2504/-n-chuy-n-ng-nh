// src/hooks/useBookings.ts
// Hook lấy danh sách đơn đặt vé cho trang admin.
// Trước đây trả về mock data hardcode -> nay gọi thật GET /bookings/admin/all
import { useState, useCallback } from 'react';
import { adminBookingApi } from '../api/adminApi';
import type { AdminBooking, AdminBookingFilters } from '../types/admin';

export type Booking = AdminBooking;
export type Filters = AdminBookingFilters;

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (filters: Filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminBookingApi.getAll(filters);
      // Backend trả { data, total, page, limit }; phòng trường hợp trả mảng thuần
      const rows = Array.isArray(res) ? res : (res?.data ?? []);
      setBookings(rows);
      setTotal(Array.isArray(res) ? rows.length : (res?.total ?? rows.length));
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? 'Không thể tải dữ liệu. Vui lòng thử lại.';
      setError(msg);
      setBookings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Admin cập nhật trạng thái đơn, sau đó cập nhật lại state cục bộ */
  const updateStatus = useCallback(async (bookingId: number | string, status: string) => {
    const updated = await adminBookingApi.updateStatus(String(bookingId), status);
    setBookings((prev) =>
      prev.map((b) =>
        String(b.bookingId) === String(bookingId) ? { ...b, ...(updated ?? {}) } : b,
      ),
    );
    return updated;
  }, []);

  return { bookings, total, loading, error, fetchBookings, updateStatus };
};
