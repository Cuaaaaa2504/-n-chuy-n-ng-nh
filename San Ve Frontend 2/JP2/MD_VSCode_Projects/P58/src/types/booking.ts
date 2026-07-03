export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

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
