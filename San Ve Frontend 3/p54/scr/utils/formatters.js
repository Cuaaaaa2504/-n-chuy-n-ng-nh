// src/utils/formatters.js
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 VNĐ';
  return amount.toLocaleString('vi-VN') + ' VNĐ';
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (dateString) => {
  return `${formatDate(dateString)} - ${formatTime(dateString)}`;
};

export const formatSeatDisplay = (seats) => {
  if (!seats || seats.length === 0) return 'Chưa chọn ghế';
  return seats.map(seat => seat.id || seat).join(', ');
};