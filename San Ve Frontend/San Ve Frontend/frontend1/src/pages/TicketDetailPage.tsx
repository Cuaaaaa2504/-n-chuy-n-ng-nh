// src/pages/TicketDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import TicketQrCode from '../components/TicketQrCode';

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

  return (
    <main className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Chi tiết vé</h1>
      {error && <p className="text-error mb-4" role="alert">{error}</p>}
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 text-center space-y-4">
        <p><span className="text-on-surface-variant">Mã vé:</span> <strong>{ticket?.id ?? ticketId}</strong></p>
        {ticket?.movieTitle && <p><span className="text-on-surface-variant">Phim:</span> <strong>{ticket.movieTitle}</strong></p>}
        {ticket?.seatCode && <p><span className="text-on-surface-variant">Ghế:</span> <strong>{ticket.seatCode}</strong></p>}
        {ticket?.showTime && <p><span className="text-on-surface-variant">Suất chiếu:</span> <strong>{ticket.showTime}</strong></p>}
        <div className="flex justify-center">
          <TicketQrCode value={ticket?.id ?? ticketId ?? ''} qrUrl={ticket?.qrUrl} size={200} />
        </div>
      </div>
    </main>
  );
}
