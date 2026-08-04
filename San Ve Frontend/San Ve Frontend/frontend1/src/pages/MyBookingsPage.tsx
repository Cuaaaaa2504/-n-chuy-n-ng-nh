// src/pages/MyBookingsPage.tsx

import { useEffect, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, getBookingTickets, getMyBookings } from '../api/bookingApi';
import {
  getRefundsByBooking,
  requestRefund,
  REFUND_STATUS_LABEL,
} from '../api/refundApi';
import type { Refund } from '../api/refundApi';
import BookingTicketsModal from '../components/BookingTicketsModal';
import EmptyTickets from '../components/tickets/EmptyTickets';
import type { Booking, BookingTicket } from '../types/booking';
import { useTheme } from '../context/useTheme';

// FIX BUG-05: bổ sung ISSUED / CONFIRMED / REFUNDED.
// 'ISSUED' là status của các booking cũ (trước khi sửa BUG-01 ở payment.service.ts),
// trước đây rơi vào fallback nên hiện nhãn tiếng Anh trần và mất nút "Xem QR vé".
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '⏳ Chờ thanh toán',
  PAID:            '✅ Đã thanh toán',
  ISSUED:          '🎟 Đã xuất vé',
  CONFIRMED:       '✅ Đã xác nhận',
  FAILED:          '❌ Thất bại',
  EXPIRED:         '⌛ Hết hạn',
  CANCELLED:       '🚫 Đã hủy',
  REFUNDED:        '💸 Đã hoàn tiền',
};

// Các trạng thái được coi là "đã mua" -> có vé để xem QR.
const PAID_STATUSES = ['PAID', 'ISSUED', 'CONFIRMED'];

/**
 * FIX [mục 5.1]: các trạng thái mà tiền đã thực sự vào hệ thống -> user có
 * quyền yêu cầu hoàn tiền.
 *
 * ⚠️ Lưu ý nghiệp vụ quan trọng (báo cáo mô tả sai chỗ này):
 * báo cáo nói "user hủy booking đã thanh toán nhưng không được hoàn tiền".
 * Thực tế `BookingService.cancelBooking()` chỉ cho phép huỷ khi status thuộc
 * ['PENDING_PAYMENT', 'CONFIRMED'] — đơn đã PAID KHÔNG huỷ được, nút "Hủy đơn"
 * cũng chỉ hiện với PENDING_PAYMENT. Nên kịch bản "huỷ vé đã trả tiền rồi mất
 * tiền" không xảy ra được.
 *
 * Vấn đề THẬT là: user đã trả tiền thì không có đường nào để đòi lại cả. Vì
 * vậy ở đây ta thêm luồng đúng: gửi YÊU CẦU hoàn tiền (trạng thái PENDING),
 * admin duyệt ở AdminRefundsPage. Không tự ý huỷ đơn hộ user.
 */
const REFUNDABLE_STATUSES = ['PAID', 'ISSUED', 'CONFIRMED', 'CANCELLED'];

// ── Ticket row card ────────────────────────────────────────────────────────
function BookingCard({
  booking,
  refund,
  onViewTickets,
  onCancel,
  onRequestRefund,
}: {
  booking: Booking;
  darkMode: boolean;
  refund?: Refund;
  onViewTickets: (booking: Booking) => void;
  onCancel: (id: string) => void;
  onRequestRefund: (booking: Booking) => void;
}) {
  const canRequestRefund = REFUNDABLE_STATUSES.includes(booking.status) && !refund;
  const paid = PAID_STATUSES.includes(booking.status);
  const initials = booking.movieTitle.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();

  return (
    <article className="stitch-card stitch-card-hover stitch-order-card">
      <div className="stitch-order-poster relative grid place-items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(83,216,244,.26),transparent_35%),linear-gradient(145deg,#1e1728,#08070b)]" />
        <span className="relative text-4xl font-extrabold text-white/85">{initials}</span>
        <span className="absolute bottom-3 left-3 right-3 stitch-kicker text-white/65">Order archive</span>
      </div>
      <div className="stitch-order-body">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={`stitch-badge ${paid ? 'stitch-badge-cyan' : booking.status === 'PENDING_PAYMENT' ? 'stitch-badge-gold' : 'stitch-badge-purple'} mb-3`}>
              {STATUS_LABEL[booking.status] || booking.status}
            </span>
            <h2 className="text-xl font-extrabold line-clamp-2">{booking.movieTitle}</h2>
          </div>
          <strong className="whitespace-nowrap" style={{ color: 'var(--st-purple)' }}>{booking.totalAmount.toLocaleString('vi-VN')}₫</strong>
        </div>
        <div className="grid gap-1 text-sm stitch-muted mt-3">
          {booking.cinemaName && <p>{booking.cinemaName}{booking.roomName ? ` · ${booking.roomName}` : ''}</p>}
          {booking.showDate && <p>{booking.showDate} {booking.showTime}</p>}
          {refund && <p style={{ color: refund.refundStatus === 'SUCCESS' ? 'var(--st-success)' : refund.refundStatus === 'FAILED' ? 'var(--st-danger)' : 'var(--st-gold)' }}>{REFUND_STATUS_LABEL[refund.refundStatus]} · {refund.refundAmount.toLocaleString('vi-VN')}₫</p>}
        </div>
        <div className="mt-auto pt-5 flex flex-wrap gap-2 border-t border-white/10">
          {paid && <button type="button" onClick={() => onViewTickets(booking)} className="stitch-btn stitch-btn-outline">Xem QR vé</button>}
          {booking.status === 'PENDING_PAYMENT' && <>
            <Link to={`/payment/${booking.id}`} className="stitch-btn stitch-btn-primary">Thanh toán</Link>
            <button type="button" onClick={() => onCancel(booking.id)} className="stitch-btn stitch-btn-danger">Hủy đơn</button>
          </>}
          {canRequestRefund && <button type="button" onClick={() => onRequestRefund(booking)} className="stitch-btn stitch-btn-gold">Yêu cầu hoàn tiền</button>}
        </div>
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

  const [page, setPage]                       = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [tickets, setTickets]                 = useState<BookingTicket[]>([]);
  const [ticketLoading, setTicketLoading]     = useState(false);
  const [ticketError, setTicketError]         = useState('');

  // FIX [mục 5.1 + 5.2]: map bookingId -> refund mới nhất của đơn đó.
  const [refunds, setRefunds]                 = useState<Record<string, Refund>>({});
  const [refundTarget, setRefundTarget]       = useState<Booking | null>(null);
  const [refundReason, setRefundReason]       = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError]         = useState('');

  const LIMIT      = 5;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchBookings = () => {
    dispatch({ type: 'FETCH_START' });
    getMyBookings({ page, limit: LIMIT })
      .then((result) =>
        dispatch({ type: 'FETCH_SUCCESS', bookings: result.items, total: result.total })
      )
      .catch((err: unknown) =>
        dispatch({
          type: 'FETCH_ERROR',
          error: (err as { message?: string }).message || 'Không tải được danh sách booking',
        })
      );
  };

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });
    getMyBookings({ page, limit: LIMIT })
      .then((result) => {
        if (!cancelled)
          dispatch({ type: 'FETCH_SUCCESS', bookings: result.items, total: result.total });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: 'FETCH_ERROR',
            error: (err as { message?: string }).message || 'Không tải được danh sách booking',
          });
      });
    return () => { cancelled = true; };
  }, [page]);

  /**
   * FIX [mục 5.2]: nạp trạng thái hoàn tiền cho các đơn thuộc diện có thể hoàn.
   *
   * Chỉ gọi cho những đơn thực sự liên quan (đã trả tiền / đã huỷ) thay vì gọi
   * cho toàn bộ danh sách — trang này phân trang 5 đơn/lần nên số request nhỏ,
   * nhưng không có lý do gì hỏi refund cho một đơn còn đang chờ thanh toán.
   */
  useEffect(() => {
    let cancelled = false;
    const targets = bookings.filter((b) => REFUNDABLE_STATUSES.includes(b.status));
    if (!targets.length) return;

    void Promise.all(
      targets.map(async (b) => [b.id, await getRefundsByBooking(b.id)] as const),
    ).then((pairs) => {
      if (cancelled) return;
      setRefunds((prev) => {
        const next = { ...prev };
        for (const [id, list] of pairs) {
          // API đã sort requestedAt DESC -> phần tử đầu là yêu cầu mới nhất.
          if (list.length) next[id] = list[0];
        }
        return next;
      });
    });

    return () => { cancelled = true; };
  }, [bookings]);

  async function submitRefund() {
    if (!refundTarget || refundSubmitting) return;
    setRefundSubmitting(true);
    setRefundError('');
    try {
      const created = await requestRefund(refundTarget.id, refundReason);
      setRefunds((prev) => ({ ...prev, [refundTarget.id]: created }));
      setRefundTarget(null);
      setRefundReason('');
    } catch (err: unknown) {
      setRefundError((err as { message?: string }).message || 'Không gửi được yêu cầu');
    } finally {
      setRefundSubmitting(false);
    }
  }

  async function openTickets(booking: Booking) {
    setSelectedBooking(booking);
    setTickets([]);
    setTicketLoading(true);
    setTicketError('');
    try {
      const rows = await getBookingTickets(booking.id);
      const seats = booking.seatCodes?.length ? booking.seatCodes : ['VÉ'];
      setTickets(rows.length > 0 ? rows : seats.map((seatCode, index) => ({
        id: `${booking.orderCode || booking.id}-${seatCode || index + 1}`,
        ticketId: `${booking.id}-${index + 1}`,
        orderCode: booking.orderCode,
        movieTitle: booking.movieTitle,
        seatCode,
        seatName: seatCode,
        showDate: booking.showDate,
        showTime: booking.showTime,
        qrCode: `${booking.orderCode || booking.id}:${seatCode}`,
        status: 'VALID',
      })));
    } catch {
      const seats = booking.seatCodes?.length ? booking.seatCodes : ['VÉ'];
      {
        setTickets(seats.map((seatCode, index) => ({
          id: `${booking.orderCode || booking.id}-${seatCode || index + 1}`,
          ticketId: `${booking.id}-${index + 1}`,
          orderCode: booking.orderCode,
          movieTitle: booking.movieTitle,
          seatCode,
          seatName: seatCode,
          showDate: booking.showDate,
          showTime: booking.showTime,
          qrCode: `${booking.orderCode || booking.id}:${seatCode}`,
          status: 'VALID',
        })));
      }
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
    <section className="stitch-page">
      <div className="stitch-container">
        <div className="mb-10">
          <p className="stitch-kicker mb-3">Transaction archive</p>
          <h1 className="stitch-page-title">Lịch sử đặt hàng</h1>
          <p className="stitch-muted mt-4">Theo dõi thanh toán, vé đã mua và trạng thái hoàn tiền.</p>
        </div>

        {loading ? (
          <div className="stitch-order-grid">{[1,2,3,4].map((item) => <div key={item} className="stitch-card h-60 animate-pulse" />)}</div>
        ) : error ? (
          <div className="stitch-card p-12 text-center" style={{ color: 'var(--st-danger)' }}>{error}</div>
        ) : bookings.length === 0 ? (
          <EmptyTickets onNavigateToMovies={() => { window.location.href = '/movies'; }} />
        ) : (
          <div className="stitch-order-grid">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                darkMode={darkMode}
                refund={refunds[booking.id]}
                onViewTickets={openTickets}
                onCancel={handleCancel}
                onRequestRefund={(target) => { setRefundReason(''); setRefundError(''); setRefundTarget(target); }}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="stitch-btn stitch-btn-outline">Trang trước</button>
            <span className="stitch-kicker">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="stitch-btn stitch-btn-outline">Trang sau</button>
          </div>
        )}

        {refundTarget && (
          <div className="fixed inset-0 z-[150] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="stitch-card p-7 w-full max-w-lg">
              <p className="stitch-kicker mb-2">Refund request</p>
              <h2 className="text-2xl font-extrabold">Yêu cầu hoàn tiền</h2>
              <p className="stitch-muted text-sm mt-3">Đơn {refundTarget.movieTitle} · {refundTarget.totalAmount.toLocaleString('vi-VN')}₫.</p>
              <textarea className="stitch-textarea mt-5" rows={4} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} maxLength={500} placeholder="Lý do yêu cầu hoàn tiền..." />
              {refundError && <p className="mt-3 text-sm" style={{ color: 'var(--st-danger)' }}>{refundError}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="stitch-btn stitch-btn-outline" onClick={() => setRefundTarget(null)} disabled={refundSubmitting}>Đóng</button>
                <button type="button" className="stitch-btn stitch-btn-primary" onClick={() => void submitRefund()} disabled={refundSubmitting}>{refundSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
              </div>
            </div>
          </div>
        )}

        <BookingTicketsModal open={Boolean(selectedBooking)} loading={ticketLoading} error={ticketError} tickets={tickets} onClose={() => setSelectedBooking(null)} onRetry={() => selectedBooking && openTickets(selectedBooking)} />
      </div>
    </section>
  );
}
