// src/pages/TicketPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface Ticket {
  id: string | number;
  movieTitle?: string;
}

export default function TicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (axiosClient.get('/tickets') as Promise<unknown>)
      .then((data) => {
        const d = data as { items?: Ticket[] } | Ticket[];
        setTickets(Array.isArray(d) ? d : (d as { items?: Ticket[] }).items ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vé của tôi</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {tickets.length === 0 ? (
        <p className="text-gray-400">Chưa có vé.</p>
      ) : (
        <div className="grid gap-4">
          {tickets.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex justify-between items-center">
              <h3 className="font-semibold">{t.movieTitle ?? 'Vé xem phim'}</h3>
              <Link to={`/tickets/${t.id}`} className="text-blue-400 hover:underline">
                Xem QR
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
