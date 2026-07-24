// src/pages/admin/AdminBookingsPage.tsx
//
// FIX BUG-02: bỏ toàn bộ class không tồn tại (admin-page, page-header,
//   filter-section, filter-grid, filter-item, filter-actions, btn btn-secondary,
//   loading-state, error-state, empty-state) -> Tailwind + AdminUI (WARN-02).
//
// FIX BUG-07: useEffect không còn phụ thuộc trực tiếp vào `fetchBookings`.
//   Reference của hàm được giữ trong ref nên dù hook có đổi cách implement
//   (bỏ useCallback, đổi deps...) effect cũng không thể chạy lặp vô hạn.
//
// FIX phụ: trước đây `if (loading) return <div>...` unmount cả khối filter mỗi
//   lần gọi API -> input mất focus khi đang gõ. Nay filter luôn được render,
//   chỉ vùng bảng đổi trạng thái.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import BookingTable from '../../components/admin/BookingTable';
import { Btn, EmptyState, ErrorBanner, Field, Loading, PageHeader, Pagination } from '../../components/admin/AdminUI';
import { inputClass } from '../../components/admin/adminUiHelpers';
import { useBookings } from '../../hooks/useBookings';

const EMPTY_FILTERS = {
  bookingCode: '',
  customerName: '',
  movieTitle: '',
  paymentStatus: '',
};

const PAGE_SIZE = 20;

const AdminBookingsPage: React.FC = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const { bookings, total, loading, error, fetchBookings } = useBookings();

  // Giữ hàm fetch trong ref -> effect bên dưới chỉ phụ thuộc [filters, page]
  const fetchRef = useRef(fetchBookings);
  useEffect(() => {
    fetchRef.current = fetchBookings;
  }, [fetchBookings]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void fetchRef.current({ ...filters, page, limit: PAGE_SIZE });
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [filters, page]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1); // đổi bộ lọc thì quay lại trang đầu
  };

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div>
      <PageHeader
        title="Quản lý Đơn Đặt Vé"
        subtitle={`Tổng: ${total.toLocaleString('vi-VN')} đơn`}
        actions={
          <Btn
            variant="ghost"
            onClick={() => void fetchRef.current({ ...filters, page, limit: PAGE_SIZE })}
            disabled={loading}
          >
            🔄 Làm mới
          </Btn>
        }
      />

      {/* Bộ lọc */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Mã đơn">
            <input
              type="text"
              name="bookingCode"
              value={filters.bookingCode}
              onChange={handleFilterChange}
              placeholder="BK20260624001"
              className={inputClass}
            />
          </Field>
          <Field label="Tên khách hàng">
            <input
              type="text"
              name="customerName"
              value={filters.customerName}
              onChange={handleFilterChange}
              placeholder="Nguyen Van A"
              className={inputClass}
            />
          </Field>
          <Field label="Phim">
            <input
              type="text"
              name="movieTitle"
              value={filters.movieTitle}
              onChange={handleFilterChange}
              placeholder="Tên phim"
              className={inputClass}
            />
          </Field>
          <Field label="Trạng thái thanh toán">
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="FAILED">Thanh toán lỗi</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end mt-4">
          <Btn variant="ghost" onClick={handleClearFilters} disabled={!hasFilter}>
            Xóa bộ lọc
          </Btn>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Loading label="Đang tải đơn đặt vé..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="🎟️"
          label={hasFilter ? 'Không có đơn nào khớp bộ lọc.' : 'Chưa có đơn đặt vé nào.'}
        />
      ) : (
        <>
          <BookingTable bookings={bookings} />
          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            onChange={setPage}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
};

export default AdminBookingsPage;
