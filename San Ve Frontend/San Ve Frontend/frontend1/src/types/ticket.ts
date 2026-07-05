// src/types/ticket.ts
export interface Ticket {
  id: string | number;
  movieTitle?: string;
  seatCode?: string;
  showTime?: string;
  showDate?: string;
  qrUrl?: string;
  status?: string;
}
