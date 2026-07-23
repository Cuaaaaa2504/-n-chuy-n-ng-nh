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

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-yellow-500',
  PAID:            'text-green-500',
  ISSUED:          'text-green-500',
  CONFIRMED:       'text-green-500',
  FAILED:          'text-red-500',
  EXPIRED:         'text-gray-400',
  CANCELLED:       'text-gray-400',
  REFUNDED:        'text-blue-400',
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
  darkMode,
  refund,
  onViewTickets,
  onCancel,
  onRequestRefund,
}: {
  booking: Booking;
  darkMode: boolean;
  /** FIX [mục 5.2]: trạng thái hoàn tiền của đơn, nếu có */
  refund?: Refund;
  onViewTickets: (b: Booking) => void;
  onCancel: (id: string) => void;
  onRequestRefund: (b: Booking) => void;
}) {
  const canRequestRefund =
    REFUNDABLE_STATUSES.includes(booking.status) && !refund;
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
          {/* ✅ XÓA 4 dòng booking.seatCodes — không có trong type Booking */}
          <p className={`text-sm font-semibold mt-1 ${STATUS_COLOR[booking.status] || 'text-gray-400'}`}>
            {STATUS_LABEL[booking.status] || booking.status}
          </p>

          {/* FIX [mục 5.2]: trước đây trang này chỉ hiện status của BOOKING.
              Sau khi gửi yêu cầu hoàn tiền, user không có cách nào biết tiền đã
              về hay chưa vì `GET /refunds/booking/:bookingId` không được gọi. */}
          {refund && (
            <p
              className={`text-sm font-semibold mt-1 ${
                refund.refundStatus === 'SUCCESS'
                  ? 'text-blue-400'
                  : refund.refundStatus === 'FAILED'
                    ? 'text-red-500'
                    : 'text-yellow-500'
              }`}
            >
              {REFUND_STATUS_LABEL[refund.refundStatus]}
              {' · '}
              {refund.refundAmount.toLocaleString('vi-VN')}₫
            </p>
          )}
        </div>
        <p className="font-bold text-blue-500 whitespace-nowrap text-base">
          {booking.totalAmount.toLocaleString('vi-VN')}₫
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {PAID_STATUSES.includes(booking.status) && (
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

        {/* FIX [mục 5.1]: đường vào duy nhất tới POST /refunds */}
        {canRequestRefund && (
          <button
            onClick={() => onRequestRefund(booking)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            💸 Yêu cầu hoàn tiền
          </button>
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

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-red-500 text-center py-8">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <EmptyTickets onNavigateToMovies={() => { window.location.href = '/movies'; }} />
      )}

      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            darkMode={darkMode}
            refund={refunds[booking.id]}
            onViewTickets={openTickets}
            onCancel={handleCancel}
            onRequestRefund={(b) => {
              setRefundReason('');
              setRefundError('');
              setRefundTarget(b);
            }}
          />
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

      {/* ── FIX [mục 5.1]: modal nhập lý do hoàn tiền ── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 ${
              darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className="text-lg font-bold">Yêu cầu hoàn tiền</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Đơn <span className="font-semibold">{refundTarget.movieTitle}</span> —{' '}
              {refundTarget.totalAmount.toLocaleString('vi-VN')}₫.
              <br />
              Yêu cầu sẽ được gửi tới quản trị viên để duyệt. Số tiền hoàn do hệ
              thống tự tra từ giao dịch thanh toán gốc.
            </p>

            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Lý do (không bắt buộc) — VD: suất chiếu bị đổi giờ"
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-amber-500/50 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 placeholder-gray-500'
                  : 'bg-white border-gray-300 placeholder-gray-400'
              }`}
            />

            {refundError && <p className="text-sm text-red-500">{refundError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRefundTarget(null)}
                disabled={refundSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold border"
              >
                Đóng
              </button>
              <button
                onClick={() => void submitRefund()}
                disabled={refundSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {refundSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
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
