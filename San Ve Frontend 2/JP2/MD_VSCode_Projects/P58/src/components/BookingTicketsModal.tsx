import { useEffect } from 'react';
import type { BookingTicket } from '../types/booking';

type Props = { open: boolean; loading: boolean; error: string; tickets: BookingTicket[]; onClose: () => void; onRetry: () => void };

export default function BookingTicketsModal({ open, loading, error, tickets, onClose, onRetry }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header"><h2>QR vé</h2><button onClick={onClose}>Đóng</button></header>
        {loading && <p>Đang tải vé...</p>}
        {error && <div className="error"><p>{error}</p><button onClick={onRetry}>Thử lại</button></div>}
        {!loading && !error && tickets.map((ticket) => (
          <article className="ticket" key={ticket.id}>
            <p><b>{ticket.movieTitle || 'Vé xem phim'}</b></p>
            <p>Ghế: {ticket.seatCode || ticket.seatName || 'N/A'}</p>
            <img className="qr" src={ticket.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${ticket.id}`} alt="QR vé" />
          </article>
        ))}
      </section>
    </div>
  );
}
