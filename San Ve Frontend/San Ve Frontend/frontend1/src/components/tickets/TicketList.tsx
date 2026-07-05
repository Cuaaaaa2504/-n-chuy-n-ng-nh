// src/components/tickets/TicketList.tsx

import React from 'react';
import type { Ticket } from '../../types/ticket';
import TicketCard from './TicketCard';

const TicketList: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => (
  <div className="ticket-list">
    {tickets.map((ticket, idx) => (
      <TicketCard key={ticket.bookingCode || idx} ticket={ticket} />
    ))}
  </div>
);

export default TicketList;
