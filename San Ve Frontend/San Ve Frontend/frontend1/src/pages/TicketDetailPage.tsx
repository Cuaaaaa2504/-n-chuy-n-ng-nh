import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
      .catch((reason: Error) => setError(reason.message));
  }, [ticketId]);

  return (
    <section className="stitch-page grid place-items-center">
      <div className="w-full max-w-md px-4">
        <Link to="/my-tickets?tab=paid" className="stitch-kicker inline-flex items-center gap-2 mb-5"><span className="material-symbols-outlined text-[18px]">arrow_back</span>Vé của tôi</Link>
        <article className="stitch-card overflow-hidden shadow-[0_0_60px_rgba(174,112,229,.2)]">
          <div className="h-32 bg-[radial-gradient(circle_at_30%_20%,rgba(220,184,255,.38),transparent_45%),linear-gradient(145deg,#24182f,#08070b)] p-6 flex flex-col justify-end">
            <p className="stitch-kicker text-white/70">Cinema access pass</p>
            <h1 className="text-2xl font-extrabold text-white">{ticket?.movieTitle || 'Chi tiết vé'}</h1>
          </div>
          <div className="p-7">
            {error && <p className="mb-5" style={{ color: 'var(--st-danger)' }}>{error}</p>}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><p className="stitch-kicker mb-1">Mã vé</p><strong className="font-mono break-all">{ticket?.id ?? ticketId}</strong></div>
              <div><p className="stitch-kicker mb-1">Ghế</p><strong>{ticket?.seatCode || '—'}</strong></div>
              <div className="col-span-2"><p className="stitch-kicker mb-1">Suất chiếu</p><strong>{ticket?.showTime || 'Đang cập nhật'}</strong></div>
            </div>
            <div className="rounded-2xl bg-white p-5 flex justify-center shadow-inner">
              <TicketQrCode value={ticket?.id ?? ticketId ?? ''} qrUrl={ticket?.qrUrl} size={220} />
            </div>
            <p className="text-center text-xs stitch-muted mt-5">Xuất trình mã QR tại quầy soát vé trước giờ chiếu.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
