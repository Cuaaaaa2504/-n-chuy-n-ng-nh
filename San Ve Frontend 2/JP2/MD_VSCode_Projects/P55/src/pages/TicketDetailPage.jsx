import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTicketDetail } from '../services/paymentService';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getTicketDetail(ticketId).then(setTicket).catch((err) => setError(err.message)); }, [ticketId]);
  return <main className="container"><h1>Chi tiết vé</h1>{error && <p className="error">{error}</p>}<section className="card"><p><b>Mã vé:</b> {ticket?.id || ticketId}</p><img className="qr" src={ticket?.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${ticketId}`} alt="QR vé" /></section></main>;
}
