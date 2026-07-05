// src/components/tickets/TicketList.tsx

import React from 'react';
import TicketCard from './TicketCard';

// ✅ Định nghĩa type thay cho any
interface Ticket {
  bookingCode?: string;
  movieTitle: string;
  cinemaName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  totalAmount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
}

const TicketList: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => ( // ✅ thay any[] → Ticket[]
  <div className="ticket-list">
    {tickets.map((ticket, idx) => (
      <TicketCard key={ticket.bookingCode || idx} ticket={ticket} />
    ))}
  </div>
);

export default TicketList;
