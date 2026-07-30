// src/pages/PaymentPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
    // FIX [lỗi biên dịch có sẵn]: `order.id` có kiểu `string | number` nên
    // truyền thẳng vào RegExp.test() (nhận `string`) làm tsc báo TS2345.
    // Ép về chuỗi trước khi kiểm tra thay vì nới lỏng type — chính cái regex
    // này là thứ chặn bookingCode 'BK-xxx' lọt xuống POST /payments.
    const realBookingId = String(order.id ?? '');
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

  if (loading) {
    return <section className="stitch-page grid place-items-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></section>;
  }

  if (fetchError && !order) {
    return (
      <section className="stitch-page grid place-items-center">
        <div className="stitch-card p-10 text-center max-w-lg">
          <span className="material-symbols-outlined text-[52px]" style={{ color: 'var(--st-danger)' }}>error</span>
          <p className="mt-3 mb-6" style={{ color: 'var(--st-danger)' }}>{fetchError}</p>
          <button className="stitch-btn stitch-btn-outline" onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </section>
    );
  }

  const canPay = isLocalMode ? true : !!selectedMethod;

  return (
    <section className="stitch-page">
      <LoadingOverlay isVisible={isProcessing} />
      <div className="stitch-payment-container">
        <button type="button" onClick={() => navigate(-1)} className="stitch-kicker inline-flex items-center gap-2 mb-5 hover:text-secondary"><span className="material-symbols-outlined text-[18px]">arrow_back</span>Quay lại</button>
        <div className="mb-10">
          <p className="stitch-kicker mb-3">Secure checkout</p>
          <h1 className="stitch-page-title">Thanh toán</h1>
          <p className="stitch-muted mt-4">Vui lòng kiểm tra đơn hàng và chọn phương thức thanh toán.</p>
        </div>

        {fetchError && <div className="stitch-card px-5 py-4 mb-6" style={{ color: 'var(--st-danger)' }}>{fetchError}</div>}
        {isExpired && <div className="stitch-card px-5 py-4 mb-6" style={{ color: 'var(--st-danger)' }}>Đơn hàng đã hết hạn. Vui lòng đặt lại.</div>}

        <div className="stitch-payment-grid">
          <div className="grid gap-6 stitch-payment-methods">
            <article className="stitch-card p-7">
              <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-white/10">
                <div><p className="stitch-kicker mb-2">Payment channel</p><h2 className="text-2xl font-extrabold">Phương thức thanh toán</h2></div>
                <span className="material-symbols-outlined" style={{ color: 'var(--st-purple)' }}>encrypted</span>
              </div>
              <div className="grid gap-3">
                {methods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setSelectedMethod(method.code)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition"
                    style={selectedMethod === method.code
                      ? { borderColor: 'var(--st-purple)', background: 'color-mix(in srgb,var(--st-purple) 12%,transparent)', boxShadow: '0 0 20px rgba(174,112,229,.13)' }
                      : { borderColor: 'var(--st-line)', background: 'var(--st-panel-light)' }}
                  >
                    <span className="text-xl">{METHOD_ICONS[method.code] ?? '💰'}</span>
                    <span className="font-semibold flex-1">{method.name}</span>
                    <span className="w-5 h-5 rounded-full border grid place-items-center" style={{ borderColor: selectedMethod === method.code ? 'var(--st-purple)' : 'var(--st-line-strong)' }}>
                      {selectedMethod === method.code && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--st-purple)' }} />}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="stitch-card p-6 flex items-start gap-3 text-sm stitch-muted">
              <span className="material-symbols-outlined" style={{ color: 'var(--st-cyan)' }}>verified_user</span>
              <p>Thông tin thanh toán được xử lý qua kết nối bảo mật. Không đóng trình duyệt trong lúc hệ thống xác nhận giao dịch.</p>
            </article>
          </div>

          <aside className="stitch-card p-7 stitch-payment-summary">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/10">
              <div><p className="stitch-kicker mb-2">Order summary</p><h2 className="text-xl font-extrabold">Chi tiết đơn hàng</h2></div>
              <span className="material-symbols-outlined" style={{ color: 'var(--st-cyan)' }}>receipt_long</span>
            </div>

            {order && (
              <div className="grid gap-5">
                <div>
                  <p className="stitch-kicker mb-2">Phim</p>
                  <h3 className="text-xl font-extrabold">{order.movieTitle}</h3>
                  {order.cinemaName && <p className="stitch-muted text-sm mt-2">{order.cinemaName}</p>}
                  {order.roomName && <p className="stitch-muted text-sm">{order.roomName}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="stitch-kicker mb-1">Ngày</p><p>{order.showDate || '—'}</p></div>
                  <div><p className="stitch-kicker mb-1">Giờ</p><p>{order.showTime || '—'}</p></div>
                </div>
                {order.seatCodes?.length ? (
                  <div><p className="stitch-kicker mb-2">Ghế</p><div className="flex flex-wrap gap-2">{order.seatCodes.map((seat) => <span key={seat} className="stitch-badge stitch-badge-cyan">{seat}</span>)}</div></div>
                ) : null}
                {order.orderCode && <div><p className="stitch-kicker mb-1">Mã đơn</p><p className="font-mono text-sm break-all">{order.orderCode}</p></div>}
                {order.expiresAt && (
                  <div className="rounded-xl border px-4 py-3 text-center" style={{ color: countdown < 60 ? 'var(--st-danger)' : 'var(--st-gold)', borderColor: countdown < 60 ? 'color-mix(in srgb,var(--st-danger) 40%,transparent)' : 'color-mix(in srgb,var(--st-gold) 40%,transparent)' }}>
                    <p className="stitch-kicker mb-1">Hết hạn sau</p><strong className="font-mono text-xl">{countdownDisplay}</strong>
                  </div>
                )}
                <div className="flex justify-between items-end pt-5 border-t border-white/10">
                  <span className="font-semibold">Tổng cộng</span>
                  <strong className="text-2xl" style={{ color: 'var(--st-purple)' }}>{order.totalAmount.toLocaleString('vi-VN')}₫</strong>
                </div>
              </div>
            )}

            {paymentError && <p className="mt-5 text-sm" style={{ color: 'var(--st-danger)' }}>{paymentError}</p>}
            {paymentStatus === 'SUCCESS' && <p className="mt-5 text-sm" style={{ color: 'var(--st-success)' }}>Thanh toán thành công!</p>}
            <button type="button" onClick={() => { void handlePay(); }} disabled={!canPay || !!isExpired || isProcessing} className="stitch-btn stitch-btn-primary w-full mt-6">
              {isProcessing ? 'Đang xử lý...' : `Xác nhận thanh toán${order ? ` ${order.totalAmount.toLocaleString('vi-VN')}₫` : ''}`}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
