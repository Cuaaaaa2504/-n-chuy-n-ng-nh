// src/components/tickets/TicketCard.tsx

import React from 'react';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface Ticket {
  bookingCode: string;
  movieTitle: string;
  cinemaName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  totalAmount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
}

const STATUS_TEXT: Record<string, string> = { PAID: 'Đã thanh toán', PENDING: 'Chờ thanh toán', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn' };
const STATUS_CLASS: Record<string, string> = { PAID: 'status-paid', PENDING: 'status-pending', CANCELLED: 'status-cancelled', EXPIRED: 'status-expired' };

const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const { bookingCode, movieTitle, cinemaName, showDate, showTime, seats, totalAmount, status } = ticket;
  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <span className="ticket-code">Mã đơn: {bookingCode}</span>
        <span className={`ticket-status ${STATUS_CLASS[status] || ''}`}>{STATUS_TEXT[status] || status}</span>
      </div>
      <div className="ticket-body">
        <h3 className="movie-title">{movieTitle}</h3>
        <div className="ticket-details">
          <div className="detail-item"><span className="detail-label">Rạp:</span><span className="detail-value">{cinemaName}</span></div>
          <div className="detail-item"><span className="detail-label">Suất chiếu:</span><span className="detail-value">{formatDate(showDate)} - {showTime}</span></div>
          <div className="detail-item"><span className="detail-label">Ghế:</span><span className="detail-value">{seats?.join(', ') || 'N/A'}</span></div>
          <div className="detail-item total-amount"><span className="detail-label">Tổng tiền:</span><span className="detail-value amount">{formatCurrency(totalAmount)}</span></div>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
