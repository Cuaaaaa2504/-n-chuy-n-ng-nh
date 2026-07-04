// src/components/tickets/TicketList.jsx
import React from 'react';
import TicketCard from './TicketCard';

const TicketList = ({ tickets }) => {
  return (
    <div className="ticket-list">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.bookingId} ticket={ticket} />
      ))}
    </div>
  );
};

export default TicketList;