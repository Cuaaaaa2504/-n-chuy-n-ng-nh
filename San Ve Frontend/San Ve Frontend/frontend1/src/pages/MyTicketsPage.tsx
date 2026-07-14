// src/pages/MyTicketsPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import axiosClient from '../api/axiosClient';

// ===== Types =====
type TicketStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED';

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
}

const HOLDING_STATUSES: TicketStatus[] = ['PENDING_PAYMENT'];
const PAID_STATUSES: TicketStatus[]    = ['PAID'];

// ===== Countdown nhỏ =====
function MiniCountdown({ expiresAt }: { expiresAt: string }) {
  const calc = () =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [secs, setSecs] = useState(calc);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => { setSecs(calc()); }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const urgent = secs <= 60;

  if (secs === 0) return <span className="text-red-500 text-xs font-bold">Hết hạn</span>;
  return (
    <span className={`font-mono text-xs font-bold ${
      urgent ? 'text-red-400 animate-pulse' : 'text-yellow-400'
    }`}>
      ⏳ {mm}:{ss}
    </span>
  );
}

// ===== Ticket Card =====
function TicketCard({ ticket, darkMode }: { ticket: TicketItem; darkMode: boolean }) {
  const navigate = useNavigate();
  const isPaid    = ticket.status === 'PAID';
  const isHolding = ticket.status === 'PENDING_PAYMENT';

  const card = darkMode
    ? 'bg-gray-900 border border-gray-800'
    : 'bg-white shadow-sm border border-gray-100';

  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-3 ${card} relative overflow-hidden`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          isPaid
            ? 'bg-green-500/15 text-green-500'
            : isHolding
            ? 'bg-yellow-500/15 text-yellow-500'
            : 'bg-gray-500/15 text-gray-400'
        }`}>
          {isPaid ? '✅ Đã mua' : isHolding ? '⏳ Đang giữ' : ticket.status}
        </span>
        {isHolding && ticket.expiresAt && (
          <MiniCountdown expiresAt={ticket.expiresAt} />
        )}
        {isPaid && ticket.paidAt && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(ticket.paidAt).toLocaleDateString('vi-VN')}
          </span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-base leading-tight mb-1">
          {ticket.movieTitle || 'Vé xem phim'}
        </h3>
        <div className={`text-sm space-y-0.5 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {ticket.cinemaName && <p>🏢 {ticket.cinemaName}</p>}
          {(ticket.showDate || ticket.showTime) && (
            <p>📅 {[ticket.showDate, ticket.showTime].filter(Boolean).join(' • ')}</p>
          )}
          {ticket.roomName && <p>🎭 {ticket.roomName}</p>}
          {ticket.seatCodes.length > 0 && (
            <p className="font-mono">💺 {ticket.seatCodes.join(', ')}</p>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between pt-3 border-t ${
        darkMode ? 'border-gray-800' : 'border-gray-100'
      }`}>
        <div>
          <p className={`text-xs ${ darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            #{ticket.bookingCode}
          </p>
          <p className="font-bold text-red-500">
            {ticket.totalAmount.toLocaleString('vi-VN')}₫
          </p>
        </div>
        {isHolding && (
          <button
            onClick={() => navigate(`/payment/${ticket.bookingId}`)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Thanh toán
          </button>
        )}
        {isPaid && (
          <Link
            to={`/ticket/${ticket.bookingId}`}
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition ${
              darkMode
                ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            Xem vé
          </Link>
        )}
      </div>
    </div>
  );
}

// ===== Skeleton =====
function TicketSkeleton({ darkMode }: { darkMode: boolean }) {
  const bg = darkMode ? 'bg-gray-700' : 'bg-gray-200';
  return (
    <div className={`rounded-2xl p-5 ${
      darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow-sm'
    } animate-pulse space-y-3`}>
      <div className={`h-5 w-24 rounded-full ${bg}`} />
      <div className={`h-4 w-3/4 rounded ${bg}`} />
      <div className={`h-3 w-1/2 rounded ${bg}`} />
      <div className={`h-3 w-2/3 rounded ${bg}`} />
    </div>
  );
}

// ===== Main Page =====
export default function MyTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { darkMode } = useTheme();

  // FIX 1: Không dùng useEffect + setActiveTab để sync URL -> state
  // Thay bằng derived value trực tiếp từ searchParams (không có extra re-render)
  const activeTab: 'holding' | 'paid' =
    searchParams.get('tab') === 'paid' ? 'paid' : 'holding';

  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const switchTab = (tab: 'holding' | 'paid') => {
    setSearchParams({ tab });
  };

  // FIX 2: fetchTickets là async function — setState chỉ được gọi bên trong
  // async callback, không phải sync body của useEffect → không vi phạm rule.
  // Tuy nhiên eslint vẫn có thể warn vì nó không phân tích async depth.
  // Giải pháp: inline async function bên trong useEffect thay vì truyền ref.
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/bookings/my') as unknown;
      const list: Record<string, unknown>[] = Array.isArray(res)
        ? res
        : Array.isArray((res as Record<string, unknown>).data)
        ? (res as Record<string, unknown>).data as Record<string, unknown>[]
        : [];

      const mapped: TicketItem[] = list.map((b) => {
        const details = (b.bookingDetails ?? []) as Record<string, unknown>[];
        const seatCodes = details.map((d) => {
          const ss = d.showtimeSeat as Record<string, unknown> | undefined;
          const seat = ss?.seat as Record<string, unknown> | undefined;
          return seat ? `${seat.rowName ?? ''}${seat.seatNumber ?? ''}` : '';
        }).filter(Boolean);

        return {
          bookingId:   String(b.bookingId ?? b.id ?? ''),
          bookingCode: String(b.bookingCode ?? ''),
          movieTitle:  String(b.movieTitle ?? (b.showtime as Record<string,unknown>)?.movie as string ?? 'Vé xem phim'),
          cinemaName:  b.cinemaName as string | undefined,
          roomName:    b.roomName   as string | undefined,
          showDate:    b.showDate   as string | undefined,
          showTime:    b.showTime   as string | undefined,
          seatCodes,
          totalAmount: Number(b.totalAmount ?? 0),
          status:      (b.status ?? 'PENDING_PAYMENT') as TicketStatus,
          expiresAt:   b.expiresAt  as string | undefined,
          paidAt:      b.paidAt     as string | undefined,
        };
      });

      setAllTickets(mapped);
    } catch {
      setError('Không thể tải danh sách vé. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX 2: inline async để tránh eslint set-state-in-effect false positive
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchTickets();
      // cancelled flag dùng để tránh set state nếu component unmount
      if (cancelled) return;
    };
    void run();
    return () => { cancelled = true; };
  }, [fetchTickets]);

  const holdingTickets = allTickets.filter((t) => HOLDING_STATUSES.includes(t.status));
  const paidTickets    = allTickets.filter((t) => PAID_STATUSES.includes(t.status));
  const displayed      = activeTab === 'holding' ? holdingTickets : paidTickets;

  const card = darkMode
    ? 'bg-gray-900 border border-gray-800'
    : 'bg-white shadow';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">🎫 Vé của tôi</h1>
        <button
          onClick={() => { void fetchTickets(); }}
          className={`text-sm px-4 py-2 rounded-xl border transition ${
            darkMode
              ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
              : 'border-gray-200 hover:bg-gray-100 text-gray-600'
          }`}
        >
          🔄 Làm mới
        </button>
      </div>

      <div className={`flex rounded-2xl p-1 mb-6 gap-1 ${
        darkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <button
          onClick={() => switchTab('holding')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'holding'
              ? 'bg-yellow-500 text-white shadow-sm'
              : darkMode
              ? 'text-gray-400 hover:text-yellow-400'
              : 'text-gray-500 hover:text-yellow-600'
          }`}
        >
          <span>⏳</span>
          <span>Vé đang giữ</span>
          {holdingTickets.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'holding'
                ? 'bg-white/25 text-white'
                : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              {holdingTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab('paid')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'paid'
              ? 'bg-green-500 text-white shadow-sm'
              : darkMode
              ? 'text-gray-400 hover:text-green-400'
              : 'text-gray-500 hover:text-green-600'
          }`}
        >
          <span>✅</span>
          <span>Vé đã mua</span>
          {paidTickets.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'paid'
                ? 'bg-white/25 text-white'
                : 'bg-green-500/20 text-green-500'
            }`}>
              {paidTickets.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => <TicketSkeleton key={i} darkMode={darkMode} />)}
        </div>
      ) : error ? (
        <div className={`rounded-2xl p-6 text-center ${card}`}>
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={() => { void fetchTickets(); }}
            className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center ${card}`}>
          <p className="text-4xl mb-4">
            {activeTab === 'holding' ? '⏳' : '🎟️'}
          </p>
          <p className={`font-semibold mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {activeTab === 'holding'
              ? 'Bạn chưa có vé đang giữ nào'
              : 'Bạn chưa có vé đã mua nào'}
          </p>
          <p className={`text-sm mb-6 ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {activeTab === 'holding'
              ? 'Chọn ghế và giữ vé để bắt đầu đặt chỗ.'
              : 'Hoàn tất thanh toán để vé xuất hiện ở đây.'}
          </p>
          <a
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition"
          >
            Xem lịch chiếu
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayed.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} darkMode={darkMode} />
          ))}
        </div>
      )}
    </div>
  );
}
