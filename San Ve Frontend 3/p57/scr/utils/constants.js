// src/utils/constants.js (thêm constants nếu cần)
export const TICKET_STATUS = {
  PAID: 'PAID',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

export const STATUS_MAP = {
  [TICKET_STATUS.PAID]: 'Đã thanh toán',
  [TICKET_STATUS.PENDING]: 'Chờ thanh toán',
  [TICKET_STATUS.CANCELLED]: 'Đã hủy',
  [TICKET_STATUS.EXPIRED]: 'Hết hạn'
};

export const STATUS_COLORS = {
  [TICKET_STATUS.PAID]: 'status-paid',
  [TICKET_STATUS.PENDING]: 'status-pending',
  [TICKET_STATUS.CANCELLED]: 'status-cancelled',
  [TICKET_STATUS.EXPIRED]: 'status-expired'
};