// src/pages/PaymentPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { getOrder, getPaymentMethods } from '../api/paymentApi';
import { usePayment } from '../hooks/usePayment';
import type { OrderDetail, PaymentMethod, PaymentMethodCode } from '../api/paymentApi';

const METHOD_ICONS: Record<string, string> = {
  MOMO: '🟣', VNPAY: '🔵', BANKING: '🏦', MOCK: '🧪', CASH: '💵',
};

function useCountdown(expiresAt?: string) {
  const [seconds, setSeconds] = useState(() =>
    expiresAt
      ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      : 0
  );
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(s);
      if (s === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { seconds, display: `${mm}:${ss}` };
}

function LoadingOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-white font-semibold text-lg">Đang xử lý thanh toán…</p>
    </div>
  );
}

function buildLocalOrder(searchParams: URLSearchParams): OrderDetail {
  return {
    id: 'local',
    orderCode: `LOCAL-${Date.now()}`,
    movieTitle: searchParams.get('movieTitle') ?? 'Vé xem phim',
    cinemaName: searchParams.get('cinema') ?? undefined,
    roomName:   searchParams.get('room')   ?? undefined,
    showDate:   searchParams.get('date')   ?? undefined,
    showTime:   searchParams.get('time')   ?? undefined,
    seatCodes:  (searchParams.get('seats') ?? '').split(',').filter(Boolean),
    totalAmount: Number(searchParams.get('total') ?? 0),
    status: 'PENDING_PAYMENT',
  };
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate    = useNavigate();
  const { darkMode } = useTheme();

  const isLocalMode = orderId === 'local';

  const [order, setOrder]                       = useState<OrderDetail | null>(null);
  const [methods, setMethods]                   = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod]     = useState<PaymentMethodCode | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [fetchError, setFetchError]             = useState('');

  const { isProcessing, paymentStatus, error: paymentError, handlePayment, resetPayment } = usePayment();
  const { seconds: countdown, display: countdownDisplay } = useCountdown(order?.expiresAt);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFetchError('');
      try {
        if (isLocalMode) {
          setOrder(buildLocalOrder(searchParams));
          setMethods([
            { code: 'MOCK', name: 'Thanh toán giả lập (Dev)' },
            { code: 'CASH', name: 'Tiền mặt tại quầy' },
          ]);
          setSelectedMethod('MOCK');
        } else if (orderId) {
          const [fetchedOrder, fetchedMethods] = await Promise.all([
            getOrder(orderId),
            getPaymentMethods(),
          ]);
          setOrder(fetchedOrder);
          setMethods(fetchedMethods);
        }
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? 'Không tải được thông tin đơn hàng';
        setFetchError(msg);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orderId, isLocalMode, searchParams]);

  const isExpired = countdown === 0 && !!order?.expiresAt;

  const handlePay = async () => {
    if (!order) return;
    const method = selectedMethod ?? (isLocalMode ? 'MOCK' : null);
    if (!method) return;
    resetPayment();

    if (isLocalMode) {
      setOrder((prev) => prev ? { ...prev, status: 'PAID' } : prev);
      // FIX BUG-04: thêm ?tab=paid, nếu không MyTicketsPage mở mặc định tab
      // "Vé đang giữ" (rỗng) -> người dùng tưởng thanh toán thất bại.
      navigate('/my-tickets?tab=paid');
      return;
    }

    if (!orderId) return;

    // FIX [bookingId must be a UUID]: KHÔNG dùng `orderId` lấy từ URL để gọi
    // /payments. URL có thể chứa bookingCode (BK-xxx) tuỳ theo trang điều hướng
    // sang (MyBookings / MyTickets / ComboPage). `order.id` là booking_id thật đã
    // được backend trả về qua GET /bookings/:id và đã được normalizeBooking xác thực.
    const realBookingId = order.id;
    if (!realBookingId || !/^\d+$/.test(realBookingId)) {
      setFetchError('Không xác định được mã đơn hàng. Vui lòng tải lại trang.');
      return;
    }

    try {
      // FIX: gọi qua usePayment để isProcessing / paymentStatus được cập nhật
      const result = await handlePayment({
        bookingId: realBookingId,
        totalAmount: order.totalAmount,
        method,
      });
      if (result.status === 'SUCCESS') {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
          return;
        }
        setOrder((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
        // FIX BUG-04: chuyển thẳng sang tab "Vé đã mua" sau khi thanh toán OK.
        navigate('/my-tickets?tab=paid');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Thanh toán thất bại';
      setFetchError(msg);
    }
  };

  const bg   = darkMode ? 'bg-gray-950 text-white'          : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border border-gray-700/40' : 'bg-white border border-gray-200 shadow-sm';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError && !order) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg}`}>
        <p className="text-red-500 font-semibold">{fetchError}</p>
        <button onClick={() => navigate(-1)} className="text-sm underline opacity-70">Quay lại</button>
      </div>
    );
  }

  const canPay = isLocalMode ? true : !!selectedMethod;

  return (
    <div className={`min-h-screen ${bg}`}>
      <LoadingOverlay isVisible={isProcessing} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="opacity-60 hover:opacity-100 transition">
            ← Quay lại
          </button>
          <h1 className="text-xl font-bold">Thanh toán</h1>
        </div>

        {fetchError && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {fetchError}
          </div>
        )}

        {isExpired && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold">
            ⏰ Đơn hàng đã hết hạn. Vui lòng đặt lại.
          </div>
        )}

        {order && (
          <div className={`rounded-2xl p-5 space-y-3 ${card}`}>
            <h2 className="font-bold text-lg">Thông tin đặt vé</h2>
            <div className="space-y-1 text-sm">
              <p><span className="opacity-60">Phim:</span> <span className="font-semibold">{order.movieTitle}</span></p>
              {order.cinemaName && <p><span className="opacity-60">Rạp:</span> {order.cinemaName}</p>}
              {order.roomName   && <p><span className="opacity-60">Phòng:</span> {order.roomName}</p>}
              {order.showDate   && <p><span className="opacity-60">Ngày:</span> {order.showDate}</p>}
              {order.showTime   && <p><span className="opacity-60">Giờ:</span> {order.showTime}</p>}
              {order.seatCodes?.length ? (
                <p><span className="opacity-60">Ghế:</span> {order.seatCodes.join(', ')}</p>
              ) : null}
              {order.orderCode  && <p><span className="opacity-60">Mã đơn:</span> <span className="font-mono">{order.orderCode}</span></p>}
            </div>

            {order.expiresAt && (
              <div className={`text-sm font-mono font-bold ${countdown < 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                ⏳ Hết hạn sau: {countdownDisplay}
              </div>
            )}

            <div className="pt-2 border-t border-current/10 flex justify-between items-center">
              <span className="font-semibold">Tổng tiền</span>
              <span className="text-xl font-bold text-red-500">
                {order.totalAmount.toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>
        )}

        {methods.length > 0 && (
          <div className={`rounded-2xl p-5 space-y-3 ${card}`}>
            <h2 className="font-bold text-lg">Phương thức thanh toán</h2>
            <div className="space-y-2">
              {methods.map((m) => (
                <button
                  key={m.code}
                  onClick={() => setSelectedMethod(m.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                    selectedMethod === m.code
                      ? 'border-red-500 bg-red-500/10'
                      : darkMode
                        ? 'border-gray-700 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="text-lg">{METHOD_ICONS[m.code] ?? '💰'}</span>
                  <span className="font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {paymentError && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {paymentError}
          </div>
        )}

        {paymentStatus === 'SUCCESS' && (
          <div className="rounded-xl px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-semibold">
            ✅ Thanh toán thành công!
          </div>
        )}

        <button
          onClick={() => { void handlePay(); }}
          disabled={!canPay || !!isExpired || isProcessing}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition text-lg"
        >
          {isProcessing ? 'Đang xử lý...' : `Thanh toán ${order ? order.totalAmount.toLocaleString('vi-VN') + '₫' : ''}`}
        </button>
      </div>
    </div>
  );
}
