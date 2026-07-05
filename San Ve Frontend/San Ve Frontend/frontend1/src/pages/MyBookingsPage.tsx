import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, getBookingTickets, getMyBookings } from '../api/bookingApi';
import BookingTicketsModal from '../components/BookingTicketsModal';
import type { Booking, BookingTicket } from '../types/booking';
import { useTheme } from '../context/ThemeContext';

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '⏳ Chờ thanh toán',
  PAID: '✅ Đã thanh toán',
  FAILED: '❌ Thất bại',
  EXPIRED: '⌛ Hết hạn',
  CANCELLED: '🚫 Đã hủy',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-yellow-500',
  PAID: 'text-green-500',
  FAILED: 'text-red-500',
  EXPIRED: 'text-gray-400',
  CANCELLED: 'text-gray-400',
};

export default function MyBookingsPage() {
  const { darkMode } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<BookingTicket[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const limit = 5;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function loadBookings() {
    setLoading(true); setError('');
    try {
      const result = await getMyBookings({ page, limit });
      setBookings(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Không tải được danh sách booking');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadBookings(); }, [page]);

  async function openTickets(booking: Booking) {
    setSelectedBooking(booking); setTickets([]); setTicketLoading(true); setTicketError('');
    try { setTickets(await getBookingTickets(booking.id)); }
    catch (err: unknown) { setTicketError((err as { message?: string }).message || 'Không tải được QR vé'); }
    finally { setTicketLoading(false); }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
    try {
      await cancelBooking(bookingId);
      loadBookings();
    } catch (err: unknown) {
      alert((err as { message?: string }).message || 'Không hủy được đơn');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-6">🎫 Vé của tôi</h1>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Bạn chưa có booking nào.
        </p>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className={`rounded-2xl p-5 border shadow-sm ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">{booking.movieTitle}</h3>
                {booking.cinemaName && (
                  <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    📍 {booking.cinemaName} {booking.roomName && `• ${booking.roomName}`}
                  </p>
                )}
                {booking.showDate && (
                  <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    🕐 {booking.showDate} {booking.showTime}
                  </p>
                )}
                <p className={`text-sm font-semibold mt-1 ${STATUS_COLOR[booking.status] || 'text-gray-400'}`}>
                  {STATUS_LABEL[booking.status] || booking.status}
                </p>
              </div>
              <p className="font-bold text-blue-500 whitespace-nowrap">
                {booking.totalAmount.toLocaleString('vi-VN')}đ
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => openTickets(booking)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                Xem QR vé
              </button>
              {booking.status === 'PENDING_PAYMENT' && (
                <>
                  <Link
                    to={`/payment/${booking.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Thanh toán
                  </Link>
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Hủy đơn
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

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
