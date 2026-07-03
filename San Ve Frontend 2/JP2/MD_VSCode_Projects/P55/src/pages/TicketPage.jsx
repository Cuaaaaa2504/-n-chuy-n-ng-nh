import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTickets } from '../services/paymentService';

export default function TicketPage() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getTickets().then((data) => setTickets(Array.isArray(data) ? data : data?.items || [])).catch((err) => setError(err.message)); }, []);
  return <main className="container"><h1>Vé của tôi</h1>{error && <p className="error">{error}</p>}{tickets.length === 0 ? <p>Chưa có vé.</p> : tickets.map((t) => <article className="card" key={t.id}><h3>{t.movieTitle || 'Vé xem phim'}</h3><Link to={`/tickets/${t.id}`}>Xem QR</Link></article>)}</main>;
}
