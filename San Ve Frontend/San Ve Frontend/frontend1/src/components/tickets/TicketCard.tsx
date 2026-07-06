// src/components/tickets/TicketCard.tsx
import React from 'react';

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

interface Props { ticket: Ticket; }

const TicketCard: React.FC<Props> = ({ ticket }) => {
  const { bookingCode, movieTitle, cinemaName, showDate, showTime, seats, totalAmount, status } = ticket;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(amount);

  const statusMap: Record<string, { text: string; cls: string }> = {
    PAID:      { text: 'Đã thanh toán', cls: 'status-paid' },
    PENDING:   { text: 'Chờ thanh toán', cls: 'status-pending' },
    CANCELLED: { text: 'Đã hủy',         cls: 'status-cancelled' },
    EXPIRED:   { text: 'Hết hạn',        cls: 'status-expired' },
  };
  const statusInfo = statusMap[status] ?? { text: status, cls: '' };

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <span className="ticket-code">Mã đơn: {bookingCode}</span>
        <span className={`ticket-status ${statusInfo.cls}`}>{statusInfo.text}</span>
      </div>
      <div className="ticket-body">
        <div className="ticket-info">
          <div className="ticket-movie"><h3 className="movie-title">{movieTitle}</h3></div>
          <div className="ticket-details">
            <div className="detail-item"><span className="detail-label">Rạp:</span><span className="detail-value">{cinemaName}</span></div>
            <div className="detail-item"><span className="detail-label">Suất chiếu:</span><span className="detail-value">{formatDate(showDate)} - {showTime}</span></div>
            <div className="detail-item"><span className="detail-label">Ghế:</span><span className="detail-value seats-list">{seats?.length > 0 ? seats.join(', ') : 'Chưa có thông tin ghế'}</span></div>
            <div className="detail-item total-amount"><span className="detail-label">Tổng tiền:</span><span className="detail-value amount">{formatCurrency(totalAmount)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
