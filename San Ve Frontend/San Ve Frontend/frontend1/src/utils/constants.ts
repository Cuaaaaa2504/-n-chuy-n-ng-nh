// src/utils/constants.ts

// ── Booking status labels ──────────────────────────────────────────────────
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID:            'Đã thanh toán',
  FAILED:          'Thất bại',
  EXPIRED:         'Đã hết hạn',
  CANCELLED:       'Đã hủy',
};

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-yellow-400',
  PAID:            'text-green-400',
  FAILED:          'text-red-500',
  EXPIRED:         'text-gray-400',
  CANCELLED:       'text-red-400',
};

// ── Showtime status labels ─────────────────────────────────────────────────
export const SHOWTIME_STATUS_LABEL: Record<string, string> = {
  ACTIVE:    'Đang chiếu',
  CANCELLED: 'Đã hủy',
  FINISHED:  'Kết thúc',
};

export const SHOWTIME_STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'text-green-400',
  CANCELLED: 'text-red-400',
  FINISHED:  'text-gray-400',
};

// ── Movie status labels ────────────────────────────────────────────────────
export const MOVIE_STATUS_LABEL: Record<string, string> = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  ENDED:       'Kết thúc',
};

export const MOVIE_STATUS_COLOR: Record<string, string> = {
  NOW_SHOWING: 'text-green-400',
  COMING_SOON: 'text-blue-400',
  ENDED:       'text-gray-400',
};

// ── Payment methods ────────────────────────────────────────────────────────
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  VNPAY:   'VNPay',
  MOMO:    'MoMo',
  ZALOPAY: 'ZaloPay',
  CASH:    'Tiền mặt',
};

// ── App routes ─────────────────────────────────────────────────────────────
export const ROUTES = {
  HOME:          '/',
  LOGIN:         '/login',
  REGISTER:      '/register',
  MOVIES:        '/movies',
  MOVIE_DETAIL:  (id: number | string) => `/movies/${id}`,
  SHOWTIMES:     (movieId: number | string) => `/movies/${movieId}/showtimes`,
  SEAT_BOOKING:  (showtimeId: number | string) => `/booking/${showtimeId}/seats`,
  PAYMENT:       (bookingId: number | string) => `/payment/${bookingId}`,
  MY_BOOKINGS:   '/my-bookings',
  TICKETS:       '/tickets',
  TICKET_DETAIL: (id: number | string) => `/tickets/${id}`,
  FORBIDDEN:     '/403',
  ADMIN:             '/admin',
  ADMIN_BOOKINGS:    '/admin/bookings',
  ADMIN_SHOWTIMES:   '/admin/showtimes',
  ADMIN_MOVIES:      '/admin/movies',
} as const;

// ── Pagination ─────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;

// ── Seat hold timeout (giây) ───────────────────────────────────────────────
export const SEAT_HOLD_TIMEOUT_SECONDS = 600; // 10 phút
