import { useEffect, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, getBookingTickets, getMyBookings } from '../api/bookingApi';
import BookingTicketsModal from '../components/BookingTicketsModal';
import EmptyTickets from '../components/tickets/EmptyTickets';
import type { Booking, BookingTicket } from '../types/booking';
import { useTheme } from '../context/ThemeContext';

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '⏳ Chờ thanh toán',
  PAID:            '✅ Đã thanh toán',
  FAILED:          '❌ Thất bại',
  EXPIRED:         '⌛ Hết hạn',
  CANCELLED:       '🚫 Đã hủy',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-yellow-500',
  PAID:            'text-green-500',
  FAILED:          'text-red-500',
  EXPIRED:         'text-gray-400',
  CANCELLED:       'text-gray-400',
};

// ── Ticket row card ────────────────────────────────────────────────────────
function BookingCard({
  booking,
  darkMode,
  onViewTickets,
  onCancel,
}: {
  booking: Booking;
  darkMode: boolean;
  onViewTickets: (b: Booking) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <article
      className={`rounded-2xl p-5 border shadow-sm transition ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{booking.movieTitle}</h3>
          {booking.cinemaName && (
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              📍 {booking.cinemaName}{booking.roomName && ` • ${booking.roomName}`}
            </p>
          )}
          {booking.showDate && (
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              🕐 {booking.showDate} {booking.showTime}
            </p>
          )}
          {booking.seatCodes && booking.seatCodes.length > 0 && (
            <p className={`text-sm mt-0.5 font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              💺 {booking.seatCodes.join(', ')}
            </p>
          )}
          <p className={`text-sm font-semibold mt-1 ${STATUS_COLOR[booking.status] || 'text-gray-400'}`}>
            {STATUS_LABEL[booking.status] || booking.status}
          </p>
        </div>
        <p className="font-bold text-blue-500 whitespace-nowrap text-base">
          {booking.totalAmount.toLocaleString('vi-VN')}₫
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {booking.status === 'PAID' && (
          <button
            onClick={() => onViewTickets(booking)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            🎟 Xem QR vé
          </button>
        )}
        {booking.status === 'PENDING_PAYMENT' && (
          <>
            <Link
              to={`/payment/${booking.id}`}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              💳 Thanh toán
            </Link>
            <button
              onClick={() => onCancel(booking.id)}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              🚫 Hủy đơn
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ── Reducer ────────────────────────────────────────────────────────────────
interface BookingState {
  bookings: Booking[];
  total: number;
  loading: boolean;
  error: string;
}

type BookingAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; bookings: Booking[]; total: number }
  | { type: 'FETCH_ERROR'; error: string };

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'FETCH_START':   return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS': return { loading: false, error: '', bookings: action.bookings, total: action.total };
    case 'FETCH_ERROR':   return { ...state, loading: false, error: action.error };
    default:              return state;
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const { darkMode } = useTheme();
  const [state, dispatch] = useReducer(bookingReducer, {
    bookings: [], total: 0, loading: false, error: '',
  });
  const { bookings, total, loading, error } = state;

  const [page, setPage]                     = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [tickets, setTickets]               = useState<BookingTicket[]>([]);
  const [ticketLoading, setTicketLoading]   = useState(false);
  const [ticketError, setTicketError]       = useState('');

  const LIMIT = 5;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchBookings = () => {
    dispatch({ type: 'FETCH_START' });
    getMyBookings({ page, limit: LIMIT })
      .then((result) => dispatch({ type: 'FETCH_SUCCESS', bookings: result.items, total: result.total }))
      .catch((err: unknown) =>
        dispatch({ type: 'FETCH_ERROR', error: (err as { message?: string }).message || 'Không tải được danh sách booking' })
      );
  };

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });
    getMyBookings({ page, limit: LIMIT })
      .then((result) => { if (!cancelled) dispatch({ type: 'FETCH_SUCCESS', bookings: result.items, total: result.total }); })
      .catch((err: unknown) => { if (!cancelled) dispatch({ type: 'FETCH_ERROR', error: (err as { message?: string }).message || 'Không tải được danh sách booking' }); });
    return () => { cancelled = true; };
  }, [page]);

  async function openTickets(booking: Booking) {
    setSelectedBooking(booking);
    setTickets([]);
    setTicketLoading(true);
    setTicketError('');
    try {
      setTickets(await getBookingTickets(booking.id));
    } catch (err: unknown) {
      setTicketError((err as { message?: string }).message || 'Không tải được QR vé');
    } finally {
      setTicketLoading(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
    try {
      await cancelBooking(bookingId);
      fetchBookings();
    } catch (err: unknown) {
      alert((err as { message?: string }).message || 'Không hủy được đơn');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-6">🎫 Vé của tôi</h1>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}

      {/* Empty state — dùng component từ p57 */}
      {!loading && !error && bookings.length === 0 && (
        <EmptyTickets onNavigateToMovies={() => window.location.href = '/movies'} />
      )}

      {/* Booking list */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            darkMode={darkMode}
            onViewTickets={openTickets}
            onCancel={handleCancel}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ← Trang trước
          </button>
          <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Trang sau →
          </button>
        </div>
      )}

      {/* QR Modal */}
      <BookingTicketsModal
        open={Boolean(selectedBooking)}
        loading={ticketLoading}
        error={ticketError}
        tickets={tickets}
        onClose={() => setSelectedBooking(null)}
        onRetry={() => selectedBooking && openTickets(selectedBooking)}
      />
    </div>
  );
}
