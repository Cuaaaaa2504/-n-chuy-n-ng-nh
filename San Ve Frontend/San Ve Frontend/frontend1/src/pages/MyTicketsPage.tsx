import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import BookingTicketsModal from '../components/BookingTicketsModal';
import TicketQrCode from '../components/TicketQrCode';
import { getBookingTickets } from '../api/bookingApi';
import { normalizeBookingCore } from '../api/bookingNormalizer';
import type { BookingTicket } from '../types/booking';
import { useAuth } from '../context/AuthContext';

type TicketStatus = 'PENDING_PAYMENT' | 'PAID' | 'ISSUED' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
interface TicketItem {
  bookingId: string;
  bookingCode: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  seatCodes: string[];
  totalAmount: number;
  status: TicketStatus;
  expiresAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}
const HOLDING_STATUSES: TicketStatus[] = ['PENDING_PAYMENT'];
const PAID_STATUSES: TicketStatus[] = ['PAID', 'ISSUED', 'CONFIRMED'];

function MiniCountdown({ expiresAt }: { expiresAt: string }) {
  const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(calc);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(calc()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  if (seconds === 0) return <span style={{ color: 'var(--st-danger)' }}>Hết hạn</span>;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return <span className="font-mono" style={{ color: seconds < 60 ? 'var(--st-danger)' : 'var(--st-gold)' }}>{mm}:{ss}</span>;
}

function TicketCard({
  ticket,
  onViewTickets,
  onViewCounterCode,
}: {
  ticket: TicketItem;
  onViewTickets: (ticket: TicketItem) => void;
  onViewCounterCode: (ticket: TicketItem) => void;
}) {
  const navigate = useNavigate();
  const isPaid = PAID_STATUSES.includes(ticket.status);
  const isHolding = HOLDING_STATUSES.includes(ticket.status);
  const isCounterHold =
    isHolding &&
    ticket.paymentMethod === 'CASH' &&
    ticket.paymentStatus === 'PENDING';
  const initials = ticket.movieTitle.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();

  return (
    <article className="stitch-card stitch-card-hover stitch-order-card">
      <div className="stitch-order-poster relative grid place-items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,184,255,.38),transparent_35%),linear-gradient(145deg,#21172c,#09080c)]" />
        <span className="relative text-4xl font-extrabold text-white/85 drop-shadow-[0_0_18px_rgba(220,184,255,.6)]">{initials}</span>
        <span className="absolute bottom-3 left-3 right-3 stitch-kicker text-white/70">CMC ticket</span>
      </div>
      <div className="stitch-order-body">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={`stitch-badge ${isPaid ? 'stitch-badge-cyan' : 'stitch-badge-gold'} mb-3`}>
              {isPaid ? 'Đã mua' : isCounterHold ? 'Chờ tại quầy' : isHolding ? 'Đang giữ' : ticket.status}
            </span>
            <h2 className="text-xl font-extrabold line-clamp-2">{ticket.movieTitle || 'Vé xem phim'}</h2>
          </div>
          {isHolding && !isCounterHold && ticket.expiresAt ? (
            <MiniCountdown expiresAt={ticket.expiresAt} />
          ) : ticket.paidAt ? (
            <span className="text-xs stitch-muted">
              {new Date(ticket.paidAt).toLocaleDateString('vi-VN')}
            </span>
          ) : null}
        </div>
        <div className="grid gap-1 text-sm stitch-muted mt-3">
          {ticket.cinemaName && <p>{ticket.cinemaName}{ticket.roomName ? ` · ${ticket.roomName}` : ''}</p>}
          {(ticket.showDate || ticket.showTime) && <p>{[ticket.showDate, ticket.showTime].filter(Boolean).join(' · ')}</p>}
          {ticket.seatCodes.length > 0 && <p className="font-mono" style={{ color: 'var(--st-cyan)' }}>Ghế {ticket.seatCodes.join(', ')}</p>}
        </div>
        <div className="mt-auto pt-5 flex items-end justify-between gap-4 border-t border-white/10">
          <div><p className="text-xs stitch-muted font-mono">Mã đơn #{ticket.bookingCode}</p><strong className="text-xl" style={{ color: 'var(--st-purple)' }}>{ticket.totalAmount.toLocaleString('vi-VN')}₫</strong></div>
          {isCounterHold ? (
            <button
              type="button"
              onClick={() => onViewCounterCode(ticket)}
              className="stitch-btn stitch-btn-primary"
            >
              Hiện mã giữ vé
            </button>
          ) : isHolding ? (
            <button type="button" onClick={() => navigate(`/payment/${ticket.bookingId}`)} className="stitch-btn stitch-btn-primary">Thanh toán</button>
          ) : isPaid ? (
            <button type="button" onClick={() => onViewTickets(ticket)} className="stitch-btn stitch-btn-outline">Xem vé</button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function MyTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const activeUserId = Number(user?.id ?? user?.userId ?? 0);
  const activeTab: 'holding' | 'paid' = searchParams.get('tab') === 'paid' ? 'paid' : 'holding';
  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<TicketItem | null>(null);
  const [ticketRows, setTicketRows] = useState<BookingTicket[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [counterTicket, setCounterTicket] = useState<TicketItem | null>(null);

  const openTickets = useCallback(async (ticket: TicketItem) => {
    setSelected(ticket);
    setTicketRows([]);
    setTicketError('');
    setTicketLoading(true);

    try {
      const rows = await getBookingTickets(ticket.bookingId);

      if (!rows.length) {
        throw new Error(
          'Đơn đã thanh toán nhưng chưa có vé điện tử. Hãy kiểm tra bước xác nhận thanh toán.',
        );
      }

      setTicketRows(rows);
    } catch (reason: unknown) {
      const message =
        (reason as { message?: string })?.message ||
        'Không tải được vé điện tử.';
      setTicketError(message);
    } finally {
      setTicketLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!Number.isInteger(activeUserId) || activeUserId <= 0) {
      setAllTickets([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/bookings/my') as unknown;
      const list: Record<string, unknown>[] = Array.isArray(response)
        ? response
        : Array.isArray((response as Record<string, unknown>).data)
          ? (response as Record<string, unknown>).data as Record<string, unknown>[]
          : [];
      const normalized = list.map((row) => {
        const core = normalizeBookingCore(row);
        return {
          bookingId: core.id,
          bookingCode: core.orderCode ?? '',
          movieTitle: core.movieTitle,
          cinemaName: core.cinemaName,
          roomName: core.roomName,
          showDate: core.showDate,
          showTime: core.showTime,
          seatCodes: core.seatCodes,
          totalAmount: core.totalAmount,
          status: core.status as TicketStatus,
          expiresAt: core.expiresAt,
          paidAt: core.paidAt,
        } satisfies TicketItem;
      });

      const enriched = await Promise.all(
        normalized.map(async (ticket) => {
          if (!HOLDING_STATUSES.includes(ticket.status)) return ticket;

          try {
            const payment = await axiosClient.get(
              `/payments/booking/${ticket.bookingId}`,
            ) as unknown as Record<string, unknown>;

            return {
              ...ticket,
              paymentMethod: String(
                payment.paymentMethod ?? payment.payment_method ?? '',
              ).toUpperCase(),
              paymentStatus: String(
                payment.paymentStatus ?? payment.payment_status ?? '',
              ).toUpperCase(),
            };
          } catch {
            return ticket;
          }
        }),
      );

      setAllTickets(enriched);
    } catch { setError('Không thể tải danh sách vé. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }, [activeUserId]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setAllTickets([]);
      setSelected(null);
      setCounterTicket(null);
      setTicketRows([]);
      setTicketError('');
    });
    void Promise.resolve().then(fetchTickets);
  }, [activeUserId, fetchTickets]);

  useEffect(() => {
    const refresh = () => {
      void fetchTickets();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchTickets]);

  const holdingTickets = allTickets.filter((ticket) => HOLDING_STATUSES.includes(ticket.status));
  const paidTickets = allTickets.filter((ticket) => PAID_STATUSES.includes(ticket.status));
  const displayed = activeTab === 'holding' ? holdingTickets : paidTickets;

  return (
    <section className="stitch-page">
      <div className="stitch-container">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-9">
          <div><p className="stitch-kicker mb-3">Ticket vault</p><h1 className="stitch-page-title">Vé của tôi</h1><p className="stitch-muted mt-4">Quản lý vé đang giữ và vé đã thanh toán.</p></div>
          <button type="button" onClick={() => void fetchTickets()} className="stitch-btn stitch-btn-outline"><span className="material-symbols-outlined">refresh</span>Làm mới</button>
        </div>

        <div className="stitch-tabs">
          <button type="button" onClick={() => setSearchParams({ tab: 'holding' })} className={`stitch-tab ${activeTab === 'holding' ? 'active' : ''}`}>Vé đang giữ ({holdingTickets.length})</button>
          <button type="button" onClick={() => setSearchParams({ tab: 'paid' })} className={`stitch-tab ${activeTab === 'paid' ? 'active' : ''}`}>Vé đã mua ({paidTickets.length})</button>
        </div>

        {loading ? (
          <div className="stitch-order-grid">{[1,2,3,4].map((item) => <div key={item} className="stitch-card h-60 animate-pulse" />)}</div>
        ) : error ? (
          <div className="stitch-card p-12 text-center"><p style={{ color: 'var(--st-danger)' }}>{error}</p><button className="stitch-btn stitch-btn-primary mt-6" onClick={() => void fetchTickets()}>Thử lại</button></div>
        ) : !displayed.length ? (
          <div className="stitch-card p-14 text-center"><span className="material-symbols-outlined text-[58px] stitch-muted">confirmation_number</span><h2 className="text-2xl font-extrabold mt-3">Chưa có vé trong mục này</h2><p className="stitch-muted mt-2">Vé đang giữ sẽ xuất hiện ngay sau khi bạn chọn ghế và nhấn Đặt vé.</p><a href="/movies" className="stitch-btn stitch-btn-primary mt-7">Khám phá phim</a></div>
        ) : (
          <div className="stitch-order-grid">
            {displayed.map((ticket) => (
              <TicketCard
                key={ticket.bookingId}
                ticket={ticket}
                onViewTickets={openTickets}
                onViewCounterCode={setCounterTicket}
              />
            ))}
          </div>
        )}

        <BookingTicketsModal open={Boolean(selected)} loading={ticketLoading} error={ticketError} tickets={ticketRows} onClose={() => setSelected(null)} onRetry={() => selected && void openTickets(selected)} />

        {counterTicket && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Mã giữ vé thanh toán tại quầy"
            onClick={() => setCounterTicket(null)}
          >
            <div
              className="stitch-card w-full max-w-md p-7 text-center"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="stitch-kicker mb-2">Counter payment</p>
              <h2 className="text-2xl font-extrabold">Mã giữ vé tại quầy</h2>
              <p className="stitch-muted mt-3 text-sm">
                Đưa mã này cho nhân viên soát vé. Vé chỉ được phát hành khi
                STAFF/ADMIN quét mã trong khung giờ check-in.
              </p>

              <div className="flex justify-center my-6">
                <TicketQrCode
                  value={counterTicket.bookingCode}
                  size={240}
                  alt={`Mã giữ vé ${counterTicket.bookingCode}`}
                />
              </div>

              <p className="font-mono font-bold break-all">
                {counterTicket.bookingCode}
              </p>
              <p className="text-sm stitch-muted mt-2">
                Ghế {counterTicket.seatCodes.join(', ')}
              </p>

              <button
                type="button"
                className="stitch-btn stitch-btn-outline w-full mt-6"
                onClick={() => setCounterTicket(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
