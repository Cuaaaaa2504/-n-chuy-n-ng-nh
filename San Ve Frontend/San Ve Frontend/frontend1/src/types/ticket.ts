// src/types/ticket.types.ts

export interface Ticket {
  bookingCode: string;       // bắt buộc – source of truth
  movieTitle: string;
  cinemaName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  totalAmount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
}
