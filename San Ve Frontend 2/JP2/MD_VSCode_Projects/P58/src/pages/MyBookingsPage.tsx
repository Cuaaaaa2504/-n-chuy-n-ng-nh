import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, getBookingTickets, getMyBookings } from '../api/bookingApi';
import BookingTicketsModal from '../components/BookingTicketsModal';
import type { Booking, BookingTicket } from '../types/booking';

export default function MyBookingsPage() {
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
    try { const result = await getMyBookings({ page, limit }); setBookings(result.items); setTotal(result.total); }
    catch (err: any) { setError(err.message || 'Không tải được danh sách booking'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadBookings(); }, [page]);

  async function openTickets(booking: Booking) {
    setSelectedBooking(booking); setTickets([]); setTicketLoading(true); setTicketError('');
    try { setTickets(await getBookingTickets(booking.id)); }
    catch (err: any) { setTicketError(err.message || 'Không tải được QR vé'); }
    finally { setTicketLoading(false); }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
    await cancelBooking(bookingId).catch((err) => alert(err.message || 'Không hủy được đơn'));
    loadBookings();
  }

  return (
    <main className="container">
      <h1>Vé của tôi</h1>
      {loading && <p>Đang tải booking...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && bookings.length === 0 && <p>Chưa có booking nào.</p>}
      {bookings.map((booking) => (
        <article className="booking-card" key={booking.id}>
          <h3>{booking.movieTitle || 'Booking xem phim'}</h3>
          <p>Trạng thái: <b>{booking.status}</b></p>
          <p>Tổng tiền: {(booking.totalAmount || 0).toLocaleString('vi-VN')}đ</p>
          <div className="actions">
            <button onClick={() => openTickets(booking)}>Xem QR vé</button>
            {booking.status === 'PENDING_PAYMENT' && <Link className="button" to={`/payment/${booking.id}`}>Quay lại thanh toán</Link>}
            {booking.status === 'PENDING_PAYMENT' && <button className="danger" onClick={() => handleCancel(booking.id)}>Hủy đơn</button>}
          </div>
        </article>
      ))}
      <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>{page}/{totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</button></div>
      <BookingTicketsModal open={Boolean(selectedBooking)} loading={ticketLoading} error={ticketError} tickets={tickets} onClose={() => setSelectedBooking(null)} onRetry={() => selectedBooking && openTickets(selectedBooking)} />
    </main>
  );
}
