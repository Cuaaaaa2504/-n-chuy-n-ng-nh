// src/components/tickets/TicketList.tsx

import React from 'react';
import TicketCard from './TicketCard';

const TicketList: React.FC<{ tickets: any[] }> = ({ tickets }) => (
  <div className="ticket-list">
    {tickets.map((ticket, idx) => <TicketCard key={ticket.bookingCode || idx} ticket={ticket} />)}
  </div>
);

export default TicketList;
