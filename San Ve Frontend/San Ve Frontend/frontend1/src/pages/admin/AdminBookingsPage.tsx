// src/pages/admin/AdminBookingsPage.tsx
import React, { useState, useEffect } from 'react';
import BookingTable from '../../components/admin/BookingTable';
import { useBookings } from '../../hooks/useBookings';

const AdminBookingsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    bookingCode: '',
    customerName: '',
    movieTitle: '',
    paymentStatus: '',
  });
  const { bookings, loading, error, fetchBookings } = useBookings();

  useEffect(() => { fetchBookings(filters); }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () =>
    setFilters({ bookingCode: '', customerName: '', movieTitle: '', paymentStatus: '' });

  if (loading) return <div className="loading-state">Đang tải dữ liệu...</div>;
  if (error)   return <div className="error-state">Không thể tải dữ liệu. Vui lòng thử lại.</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Quản lý Đơn Đặt Vé</h2>
      </div>

      <div className="filter-section">
        <div className="filter-grid">
          <div className="filter-item">
            <label htmlFor="bookingCode">Mã đơn</label>
            <input type="text" id="bookingCode" name="bookingCode" value={filters.bookingCode} onChange={handleFilterChange} placeholder="BK20260624001" />
          </div>
          <div className="filter-item">
            <label htmlFor="customerName">Tên khách hàng</label>
            <input type="text" id="customerName" name="customerName" value={filters.customerName} onChange={handleFilterChange} placeholder="Nguyen Van A" />
          </div>
          <div className="filter-item">
            <label htmlFor="movieTitle">Phim</label>
            <input type="text" id="movieTitle" name="movieTitle" value={filters.movieTitle} onChange={handleFilterChange} placeholder="Avengers Endgame" />
          </div>
          <div className="filter-item">
            <label htmlFor="paymentStatus">Trạng thái thanh toán</label>
            <select id="paymentStatus" name="paymentStatus" value={filters.paymentStatus} onChange={handleFilterChange}>
              <option value="">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="FAILED">Thanh toán lỗi</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={handleClearFilters}>Xóa bộ lọc</button>
        </div>
      </div>

      {bookings.length === 0
        ? <div className="empty-state">Chưa có đơn đặt vé nào.</div>
        : <BookingTable bookings={bookings} />
      }
    </div>
  );
};

export default AdminBookingsPage;
