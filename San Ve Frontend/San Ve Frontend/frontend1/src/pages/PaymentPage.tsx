import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getOrder, getPaymentMethods, payOrder } from '../api/paymentApi';
import type { OrderDetail, PaymentMethod, PaymentMethodCode } from '../api/paymentApi';

const METHOD_ICONS: Record<string, string> = {
  MOMO: '🟣',
  VNPAY: '🔵',
  ZALOPAY: '🔷',
  CREDIT_CARD: '💳',
  CASH: '💵',
};

function useCountdown(expiresAt?: string) {
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const timer = setInterval(() => {
      const s = calc();
      setSeconds(s);
      if (s === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { seconds, display: `${mm}:${ss}` };
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const { seconds: countdown, display: countdownDisplay } = useCountdown(order?.expiresAt);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const [ord, mths] = await Promise.all([getOrder(orderId), getPaymentMethods()]);
        if (cancelled) return;
        setOrder(ord);
        setMethods(mths);
        if (mths.length > 0) setSelectedMethod(mths[0].code);
      } catch (e: unknown) {
        if (!cancelled)
          setFetchError((e as { message?: string })?.message || 'Không thể tải thông tin đơn hàng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (order?.expiresAt && countdown === 0) {
      navigate('/my-tickets', { replace: true });
    }
  }, [countdown, order?.expiresAt, navigate]);

  const handlePay = async () => {
    if (!orderId || !selectedMethod) return;
    setPaying(true);
    setError('');
    try {
      const result = await payOrder(orderId, selectedMethod);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        navigate('/my-tickets', { replace: true });
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setPaying(false);
    }
  };

  const card = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white shadow';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Đang tải thông tin thanh toán…</p>
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-4">{fetchError || 'Không tìm thấy đơn hàng.'}</p>
          <button onClick={() => navigate(-1)} className="bg-red-500 text-white px-5 py-2 rounded-lg">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const isExpired = order.expiresAt && countdown === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Thanh toán</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Mã đơn: <span className="font-mono font-semibold">{order.orderCode ?? order.id}</span>
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className={`px-4 py-2 rounded-xl border font-semibold text-sm ${
            darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          ← Quay lại
        </button>
      </div>

      {order.expiresAt && (
        <div
          className={`rounded-2xl p-4 mb-5 flex items-center justify-between ${
            isExpired ? 'bg-red-900/30 border border-red-700' : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}
        >
          <span className={`font-semibold text-sm ${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
            {isExpired ? '⏰ Đơn hàng đã hết hạn' : '⏳ Thời gian giữ ghế còn lại'}
          </span>
          <span
            className={`font-mono text-xl font-bold ${
              isExpired ? 'text-red-400' : countdown <= 60 ? 'text-red-400' : 'text-yellow-400'
            }`}
          >
            {countdownDisplay}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className={`md:col-span-3 rounded-2xl p-5 ${card}`}>
          <h2 className="font-bold text-base mb-4">Thông tin đơn hàng</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Phim:</span>
              <span className="font-semibold">{order.movieTitle}</span>
            </p>
            {order.cinemaName && (
              <p>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Rạp:</span>
                {order.cinemaName}
              </p>
            )}
            {order.roomName && (
              <p>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Phòng:</span>
                {order.roomName}
              </p>
            )}
            {order.showDate && (
              <p>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Ngày chiếu:</span>
                {order.showDate}
              </p>
            )}
            {order.showTime && (
              <p>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Giờ chiếu:</span>
                {order.showTime}
              </p>
            )}
            {order.seatCodes && order.seatCodes.length > 0 && (
              <p>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>Ghế:</span>
                <span className="font-mono font-semibold">{order.seatCodes.join(', ')}</span>
              </p>
            )}
          </div>
          <div
            className={`mt-5 pt-4 border-t flex justify-between items-center ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <span className="font-bold">Tổng thanh toán</span>
            <span className="text-red-500 text-xl font-extrabold">
              {order.totalAmount.toLocaleString('vi-VN')}₫
            </span>
          </div>
        </div>

        <div className={`md:col-span-2 rounded-2xl p-5 ${card}`}>
          <h2 className="font-bold text-base mb-4">Phương thức</h2>
          <div className="space-y-2">
            {methods.map((m) => (
              <button
                key={m.code}
                onClick={() => setSelectedMethod(m.code)}
                disabled={!!isExpired}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm transition ${
                  selectedMethod === m.code
                    ? 'bg-red-500 text-white border-red-500'
                    : darkMode
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">{METHOD_ICONS[m.code] ?? '💰'}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className={`px-5 py-3 rounded-xl border font-semibold ${
            darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          Huỷ
        </button>
        <button
          onClick={handlePay}
          disabled={!selectedMethod || !!isExpired || paying}
          className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? 'Đang xử lý…' : `Thanh toán ${order.totalAmount.toLocaleString('vi-VN')}₫`}
        </button>
      </div>
    </div>
  );
}
