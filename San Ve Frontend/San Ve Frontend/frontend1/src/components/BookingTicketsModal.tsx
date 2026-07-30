import { useEffect } from 'react';
import type { BookingTicket } from '../types/booking';
import TicketQrCode from './TicketQrCode';

type Props = {
  open: boolean;
  loading: boolean;
  error: string;
  tickets: BookingTicket[];
  onClose: () => void;
  onRetry: () => void;
};

export default function BookingTicketsModal({ open, loading, error, tickets, onClose, onRetry }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/75 px-4 py-8 backdrop-blur-md" onMouseDown={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="booking-tickets-title" className="stitch-card w-full max-w-3xl max-h-full overflow-y-auto p-7" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-5 pb-5 mb-6 border-b border-white/10">
          <div><p className="stitch-kicker mb-2">Digital access pass</p><h2 id="booking-tickets-title" className="text-2xl font-extrabold">QR vé của bạn</h2></div>
          <button type="button" onClick={onClose} className="stitch-icon-btn border border-white/10" aria-label="Đóng"><span className="material-symbols-outlined">close</span></button>
        </header>

        {loading && <div className="grid place-items-center py-14"><div className="w-11 h-11 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        {error && <div className="text-center py-10"><p style={{ color: 'var(--st-danger)' }}>{error}</p><button type="button" onClick={onRetry} className="stitch-btn stitch-btn-primary mt-5">Thử lại</button></div>}
        {!loading && !error && !tickets.length && <p className="text-center stitch-muted py-12">Không có vé nào.</p>}

        <div className="grid sm:grid-cols-2 gap-5">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="stitch-card p-5 text-center">
              <span className="stitch-badge stitch-badge-purple mb-4">CMC Ticket</span>
              <h3 className="text-lg font-extrabold">{ticket.movieTitle || 'Vé xem phim'}</h3>
              <p className="stitch-muted text-sm mt-2 mb-5">Ghế <strong style={{ color: 'var(--st-cyan)' }}>{ticket.seatCode || ticket.seatName || 'N/A'}</strong></p>
              <div className="rounded-2xl bg-white p-4 flex justify-center"><TicketQrCode value={ticket.qrCode || ticket.orderCode || ticket.id} qrUrl={ticket.qrUrl} size={180} /></div>
              <p className="stitch-kicker mt-4 break-all">{ticket.orderCode || ticket.qrCode || ticket.id}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
