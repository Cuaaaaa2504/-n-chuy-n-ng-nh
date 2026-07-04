import React from 'react';

const BookingStatusBadge = ({ status }) => {
  const statusMap = {
    PAID: { label: 'Đã thanh toán', className: 'status-paid' },
    PENDING: { label: 'Chờ thanh toán', className: 'status-pending' },
    FAILED: { label: 'Thanh toán lỗi', className: 'status-failed' },
    REFUNDED: { label: 'Đã hoàn tiền', className: 'status-refunded' }
  };

  const statusInfo = statusMap[status] || statusMap.PENDING;
  
  return (
    <span className={`status-badge ${statusInfo.className}`}>
      {statusInfo.label}
    </span>
  );
};

export default BookingStatusBadge;