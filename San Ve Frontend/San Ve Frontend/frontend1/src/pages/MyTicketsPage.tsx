// src/pages/MyTicketsPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import axiosClient from '../api/axiosClient';
import BookingTicketsModal from '../components/BookingTicketsModal';
import { getBookingTickets } from '../api/bookingApi';
import { normalizeBookingCore } from '../api/bookingNormalizer';
import type { BookingTicket } from '../types/booking';

// ===== Types =====
type TicketStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'ISSUED'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED';

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
// FIX BUG-01 (phía FE): sau khi backend đổi sang 'PAID', các booking CŨ trong DB
// vẫn đang mang status 'ISSUED'. Chấp nhận cả 'ISSUED'/'CONFIRMED' để vé cũ
// không bị "mất tích" ở tab Đã mua.
const PAID_STATUSES: TicketStatus[]    = ['PAID', 'ISSUED', 'CONFIRMED'];

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
function TicketCard({
  ticket,
  darkMode,
  onViewTickets,
}: {
  ticket: TicketItem;
  darkMode: boolean;
  onViewTickets: (t: TicketItem) => void;
}) {
  const navigate = useNavigate();
  const isPaid    = PAID_STATUSES.includes(ticket.status);
  const isHolding = HOLDING_STATUSES.includes(ticket.status);

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
        {/* FIX [mục 7.1 — lỗi thật, báo cáo chẩn đoán nhầm nguyên nhân]
            Link cũ: <Link to={`/ticket/${ticket.bookingId}`}>
            Hỏng vì HAI lý do cùng lúc:
              1. Route đăng ký ở routes/index.tsx là "/tickets/:ticketId"
                 (SỐ NHIỀU). "/ticket/..." không khớp route nào -> rơi vào
                 NotFoundPage.
              2. Kể cả sửa thành "/tickets/", tham số truyền vào vẫn là
                 bookingId, trong khi TicketDetailPage gọi GET /tickets/:code
                 với mã VÉ. Một booking nhiều ghế = nhiều vé, không có ánh xạ
                 1-1 nào từ bookingId sang mã vé cả.
            Vì vậy nút này chuyển sang mở modal danh sách vé của đơn
            (GET /bookings/:id/tickets) — đúng quan hệ 1 đơn ↔ N vé, và dùng
            lại đúng luồng mà MyBookingsPage đã chạy tốt. */}
        {isPaid && (
          <button
            onClick={() => onViewTickets(ticket)}
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition ${
              darkMode
                ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            Xem vé
          </button>
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

  // FIX [mục 7.1]: modal QR vé cho nút "Xem vé" — thay cho link /ticket/:id hỏng.
  const [selected, setSelected]           = useState<TicketItem | null>(null);
  const [ticketRows, setTicketRows]       = useState<BookingTicket[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError]     = useState('');

  const openTickets = useCallback(async (t: TicketItem) => {
    setSelected(t);
    setTicketRows([]);
    setTicketError('');
    setTicketLoading(true);
    try {
      setTicketRows(await getBookingTickets(t.bookingId));
    } catch (err: unknown) {
      setTicketError((err as { message?: string }).message || 'Không tải được QR vé');
    } finally {
      setTicketLoading(false);
    }
  }, []);

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

      // FIX [mục 9.1 — bản normalize THỨ BA, báo cáo bỏ sót]
      //
      // Báo cáo chỉ ra 2 hàm `normalizeBooking` (bookingApi + paymentApi).
      // Thực tế có 3: khối map viết tay ở đây là bản thứ ba, lặp lại y hệt
      // logic đọc quan hệ lồng nhau showtime -> movie / room -> cinema, tách
      // ngày/giờ từ startTime, và dựng mã ghế từ seatRow + seatNumber.
      //
      // Cả ba đã được gộp về `bookingNormalizer.ts`. Riêng bản ở đây từng có
      // 2 comment FIX ghi lại đúng những lỗi mà 2 bản kia vẫn còn (thiếu
      // `.title` gây "[object Object]", và fallback `seatRow`/`rowName`) —
      // bằng chứng rõ nhất cho việc sửa một chỗ mà quên hai chỗ còn lại.
      const mapped: TicketItem[] = list.map((b) => {
        const core = normalizeBookingCore(b);
        return {
          bookingId:   core.id,
          bookingCode: core.orderCode ?? '',
          movieTitle:  core.movieTitle,
          cinemaName:  core.cinemaName,
          roomName:    core.roomName,
          showDate:    core.showDate,
          showTime:    core.showTime,
          seatCodes:   core.seatCodes,
          totalAmount: core.totalAmount,
          status:      core.status as TicketStatus,
          expiresAt:   core.expiresAt,
          paidAt:      core.paidAt,
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
            <TicketCard
              key={ticket.bookingId}
              ticket={ticket}
              darkMode={darkMode}
              onViewTickets={openTickets}
            />
          ))}
        </div>
      )}

      {/* FIX [mục 7.1]: dùng lại đúng modal mà MyBookingsPage đang chạy tốt,
          thay vì điều hướng sang một route không tồn tại. */}
      <BookingTicketsModal
        open={Boolean(selected)}
        loading={ticketLoading}
        error={ticketError}
        tickets={ticketRows}
        onClose={() => setSelected(null)}
        onRetry={() => selected && void openTickets(selected)}
      />
    </div>
  );
}
