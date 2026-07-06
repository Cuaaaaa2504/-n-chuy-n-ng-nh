// src/components/admin/BookingTable.tsx
import React from 'react';
import BookingStatusBadge from './BookingStatusBadge';

interface Booking {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  movieTitle: string;
  showtime: string;
  seats: string[];
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
}

interface Props {
  bookings: Booking[];
}

const BookingTable: React.FC<Props> = ({ bookings }) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <div className="table-container">
      {/* Desktop Table */}
      <table className="admin-table desktop-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Phim</th>
            <th>Suất chiếu</th>
            <th>Ghế</th>
            <th>Tổng tiền</th>
            <th>Thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.bookingId}>
              <td className="booking-code">{booking.bookingCode}</td>
              <td>{booking.customerName}</td>
              <td>{booking.movieTitle}</td>
              <td>{booking.showtime}</td>
              <td>{booking.seats.join(', ')}</td>
              <td>{formatCurrency(booking.totalAmount)}</td>
              <td><BookingStatusBadge status={booking.paymentStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="mobile-cards">
        {bookings.map((booking) => (
          <div key={booking.bookingId} className="card-item booking-card">
            <div className="card-header">
              <span className="card-id">{booking.bookingCode}</span>
              <BookingStatusBadge status={booking.paymentStatus} />
            </div>
            <div className="card-body">
              <div className="card-row"><span className="card-label">Khách hàng:</span><span className="card-value">{booking.customerName}</span></div>
              <div className="card-row"><span className="card-label">Phim:</span><span className="card-value">{booking.movieTitle}</span></div>
              <div className="card-row"><span className="card-label">Suất chiếu:</span><span className="card-value">{booking.showtime}</span></div>
              <div className="card-row"><span className="card-label">Ghế:</span><span className="card-value">{booking.seats.join(', ')}</span></div>
              <div className="card-row"><span className="card-label">Tổng tiền:</span><span className="card-value amount">{formatCurrency(booking.totalAmount)}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingTable;
