export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'ISSUED'      // booking cũ (trước fix BUG-01) vẫn còn status này trong DB
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Booking {
  id: string;
  orderCode?: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt?: string;
}

export interface BookingTicket {
  id: string | number;
  ticketId?: number | string;
  orderCode?: string;
  movieTitle: string;
  seatCode?: string;
  seatName?: string;
  showDate?: string;
  showTime?: string;
  qrCode?: string;
  qrUrl?: string;
  status?: string;
}
