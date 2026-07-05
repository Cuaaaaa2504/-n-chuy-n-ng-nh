// src/pages/TicketDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface TicketDetail {
  id?: string | number;
  movieTitle?: string;
  qrUrl?: string;
  seatCode?: string;
  showTime?: string;
}

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticketId) return;
    (axiosClient.get(`/tickets/${ticketId}`) as Promise<unknown>)
      .then((data) => setTicket(data as TicketDetail))
      .catch((err: Error) => setError(err.message));
  }, [ticketId]);

  const qrUrl = ticket?.qrUrl
    ?? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketId}`;

  return (
    <main className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Chi tiết vé</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center space-y-4">
        <p><span className="text-gray-400">Mã vé:</span> <strong>{ticket?.id ?? ticketId}</strong></p>
        {ticket?.movieTitle && <p><span className="text-gray-400">Phim:</span> <strong>{ticket.movieTitle}</strong></p>}
        {ticket?.seatCode && <p><span className="text-gray-400">Ghế:</span> <strong>{ticket.seatCode}</strong></p>}
        {ticket?.showTime && <p><span className="text-gray-400">Suất chiếu:</span> <strong>{ticket.showTime}</strong></p>}
        <img
          src={qrUrl}
          alt="QR vé"
          className="mx-auto rounded-xl border border-gray-600"
          width={200}
          height={200}
        />
      </div>
    </main>
  );
}
