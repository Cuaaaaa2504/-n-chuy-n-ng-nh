import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder, getPaymentMethods, payOrder } from '../services/paymentService';

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [methods, setMethods] = useState([]);
  const [methodId, setMethodId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getOrder(orderId).then((data) => { setOrder(data); localStorage.setItem('lastOrder', JSON.stringify(data)); }); getPaymentMethods().then(setMethods); }, [orderId]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (methods[0] && !methodId) setMethodId(methods[0].id); }, [methods, methodId]);

  const expired = useMemo(() => order?.expiresAt ? new Date(order.expiresAt).getTime() <= now : false, [order, now]);
  const secondsLeft = order?.expiresAt ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now) / 1000)) : 0;

  async function handlePay() {
    if (!order) return;
    if (expired) return setError('Đơn hàng đã hết hạn thanh toán.');
    setLoading(true); setError('');
    try {
      const result = await payOrder({ orderId: order.id || orderId, methodId });
      const ticketId = result.ticketId || result.data?.ticketId;
      navigate(ticketId ? `/tickets/${ticketId}` : '/tickets');
    } catch (err) { setError(err.message || 'Thanh toán thất bại'); }
    finally { setLoading(false); }
  }

  if (!order) return <main className="container">Đang tải đơn hàng...</main>;
  return (
    <main className="container">
      <h1>Thanh toán</h1>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <p><b>Mã đơn:</b> {order.id || orderId}</p>
        <p><b>Tổng tiền:</b> {(order.totalAmount || 0).toLocaleString('vi-VN')}đ</p>
        <p><b>Hạn thanh toán:</b> {expired ? 'Đã hết hạn' : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}</p>
        <h3>Phương thức thanh toán</h3>
        {methods.map((m) => <label key={m.id} className="method"><input type="radio" checked={methodId === m.id} onChange={() => setMethodId(m.id)} /> {m.name}</label>)}
        <button disabled={loading || expired || !methodId} onClick={handlePay}>{loading ? 'Đang xử lý...' : 'Thanh toán'}</button>
      </section>
    </main>
  );
}
