// src/components/tickets/TicketCard.jsx
import React from 'react';

const TicketCard = ({ ticket }) => {
  const {
    bookingCode,
    movieTitle,
    cinemaName,
    showDate,
    showTime,
    seats,
    totalAmount,
    status
  } = ticket;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusText = (status) => {
    const statusMap = {
      'PAID': 'Đã thanh toán',
      'PENDING': 'Chờ thanh toán',
      'CANCELLED': 'Đã hủy',
      'EXPIRED': 'Hết hạn'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'PAID': 'status-paid',
      'PENDING': 'status-pending',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return classMap[status] || '';
  };

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <span className="ticket-code">Mã đơn: {bookingCode}</span>
        <span className={`ticket-status ${getStatusClass(status)}`}>
          {getStatusText(status)}
        </span>
      </div>
      
      <div className="ticket-body">
        <div className="ticket-info">
          <div className="ticket-movie">
            <h3 className="movie-title">{movieTitle}</h3>
          </div>
          
          <div className="ticket-details">
            <div className="detail-item">
              <span className="detail-label">Rạp:</span>
              <span className="detail-value">{cinemaName}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Suất chiếu:</span>
              <span className="detail-value">
                {formatDate(showDate)} - {showTime}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Ghế:</span>
              <span className="detail-value seats-list">
                {seats && seats.length > 0 ? seats.join(', ') : 'Chưa có thông tin ghế'}
              </span>
            </div>
            
            <div className="detail-item total-amount">
              <span className="detail-label">Tổng tiền:</span>
              <span className="detail-value amount">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;