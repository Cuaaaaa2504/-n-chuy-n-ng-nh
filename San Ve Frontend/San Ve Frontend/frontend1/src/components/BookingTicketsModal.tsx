import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

type GroupQrPayload = {
  type: 'CMC_BOOKING_TICKETS';
  version: 1;
  orderCode: string;
  movieTitle: string;
  seats: string[];
  ticketCodes: string[];
};

export default function BookingTicketsModal({
  open,
  loading,
  error,
  tickets,
  onClose,
  onRetry,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const firstTicket = tickets[0];

  const seats = useMemo(
    () =>
      Array.from(
        new Set(
          tickets
            .map((ticket) => ticket.seatCode || ticket.seatName)
            .filter((seat): seat is string => Boolean(seat?.trim()))
            .map((seat) => seat.trim()),
        ),
      ),
    [tickets],
  );

  const ticketCodes = useMemo(
    () =>
      Array.from(
        new Set(
          tickets
            .map((ticket) => ticket.ticketCode)
            .filter((code): code is string => Boolean(code?.trim()))
            .map((code) => code.trim()),
        ),
      ),
    [tickets],
  );

  const groupQrValue = useMemo(() => {
    if (!tickets.length) return '';

    const payload: GroupQrPayload = {
      type: 'CMC_BOOKING_TICKETS',
      version: 1,
      orderCode: firstTicket?.orderCode || '',
      movieTitle: firstTicket?.movieTitle || 'Vé xem phim',
      seats,
      ticketCodes,
    };

    return JSON.stringify(payload);
  }, [tickets, firstTicket?.orderCode, firstTicket?.movieTitle, seats, ticketCodes]);

  if (!open) return null;

  const modal = (
    <div
      className="booking-ticket-overlay fixed inset-0 z-[9999] grid place-items-center px-4 py-6"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-tickets-title"
        className="booking-ticket-modal w-full max-w-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="booking-ticket-header">
          <div>
            <p className="stitch-kicker mb-2">Digital access pass</p>
            <h2 id="booking-tickets-title" className="text-2xl font-extrabold">
              QR vé của bạn
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="stitch-icon-btn booking-ticket-close"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {loading && (
          <div className="grid place-items-center py-14">
            <div className="w-11 h-11 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <p style={{ color: 'var(--st-danger)' }}>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="stitch-btn stitch-btn-primary mt-5"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && !tickets.length && (
          <p className="text-center stitch-muted py-12">Không có vé nào.</p>
        )}

        {!loading && !error && tickets.length > 0 && (
          <article className="booking-ticket-single">
            <span className="stitch-badge stitch-badge-purple mb-4">
              CMC Ticket
            </span>

            <h3 className="booking-ticket-movie">
              {firstTicket?.movieTitle || 'Vé xem phim'}
            </h3>

            {(firstTicket?.showDate || firstTicket?.showTime) && (
              <p className="booking-ticket-showtime">
                {[firstTicket?.showDate, firstTicket?.showTime]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}

            <div className="booking-ticket-seat-row">
              <span>Ghế</span>
              <strong>{seats.length ? seats.join(', ') : 'N/A'}</strong>
            </div>

            <div className="booking-ticket-qr">
              <TicketQrCode
                value={groupQrValue}
                size={240}
                alt={`QR cho các ghế ${seats.join(', ')}`}
              />
            </div>

            <div className="booking-ticket-codes">
              <p className="text-xs stitch-muted mb-2">Mã vé dùng để soát tại rạp</p>
              <div className="grid gap-1">
                {tickets.map((ticket) => (
                  <code
                    key={String(ticket.ticketId ?? ticket.id)}
                    className="text-xs break-all"
                    style={{ color: 'var(--st-cyan)' }}
                  >
                    {ticket.seatCode || ticket.seatName || 'Vé'}: {ticket.ticketCode}
                  </code>
                ))}
              </div>
            </div>

            <div className="booking-ticket-meta">
              <span>{seats.length} ghế</span>
              {firstTicket?.orderCode && (
                <span>Mã đơn: {firstTicket.orderCode}</span>
              )}
            </div>

            <p className="booking-ticket-note">
              Một mã QR đại diện cho toàn bộ ghế trong đơn.
            </p>
          </article>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
