export const BOOKING_STATUS = {
  PENDING:   { label: 'Chờ thanh toán', className: 'badge badge--warning' },
  PAID:      { label: 'Đã thanh toán',  className: 'badge badge--success' },
  CANCELLED: { label: 'Đã hủy',         className: 'badge badge--danger'  },
  REFUNDED:  { label: 'Đã hoàn tiền',   className: 'badge badge--info'    },
  EXPIRED:   { label: 'Hết hạn',        className: 'badge badge--muted'   },
};

export const SHOWTIME_STATUS = {
  SCHEDULED: { label: 'Đã lên lịch', className: 'badge badge--info'    },
  SELLING:   { label: 'Đang bán vé', className: 'badge badge--success' },
  FINISHED:  { label: 'Đã chiếu',    className: 'badge badge--muted'   },
  CANCELLED: { label: 'Đã hủy',      className: 'badge badge--danger'  },
};

// Status lạ -> hiện "Không xác định", KHÔNG fallback sang một status hợp lệ.
export function resolveStatus(map, status) {
  return map[status] || { label: `Không xác định (${status ?? 'rỗng'})`, className: 'badge badge--unknown' };
}
