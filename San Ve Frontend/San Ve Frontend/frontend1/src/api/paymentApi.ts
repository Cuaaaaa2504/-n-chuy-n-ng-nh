import axiosClient from './axiosClient';

export type PaymentMethodCode = 'CASH' | 'MOMO' | 'VNPAY' | 'ZALOPAY' | 'CREDIT_CARD';

export interface PaymentMethod {
  code: PaymentMethodCode;
  name: string;
  icon?: string;
}

export interface OrderDetail {
  id: string | number;
  orderCode?: string;
  movieTitle: string;
  cinemaName?: string;
  roomName?: string;
  showDate?: string;
  showTime?: string;
  seatCodes?: string[];
  totalAmount: number;
  status: string;
  expiresAt?: string;
}

function normalizeOrder(raw: Record<string, unknown>): OrderDetail {
  return {
    ...(raw as OrderDetail),
    id: String(raw.id ?? raw.orderId ?? raw.orderCode ?? ''),
    orderCode: raw.orderCode as string | undefined,
    movieTitle: (raw.movieTitle ?? (raw.movie as Record<string, unknown>)?.title ?? 'Đặt vé xem phim') as string,
    totalAmount: Number(raw.totalAmount ?? raw.amount ?? 0),
    seatCodes: (Array.isArray(raw.seatCodes) ? raw.seatCodes : raw.seats ? (raw.seats as Record<string, unknown>[]).map(s => s.seatCode ?? s.code) : []) as string[],
  };
}

export async function getOrder(orderId: string): Promise<OrderDetail> {
  if (!orderId) throw new Error('Thiếu mã đơn hàng');
  const payload = await axiosClient.get(`/orders/${orderId}`) as Record<string, unknown>;
  const raw = (payload.data ?? payload) as Record<string, unknown>;
  return normalizeOrder(raw);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const payload = await axiosClient.get('/payment-methods') as Record<string, unknown>;
    const list = Array.isArray(payload) ? payload : (payload.data as unknown[] ?? []);
    return list as PaymentMethod[];
  } catch {
    // Fallback nếu API chưa có endpoint này
    return [
      { code: 'MOMO', name: 'Ví MoMo' },
      { code: 'VNPAY', name: 'VNPay' },
      { code: 'ZALOPAY', name: 'ZaloPay' },
      { code: 'CREDIT_CARD', name: 'Thẻ tín dụng' },
      { code: 'CASH', name: 'Tiền mặt tại quầy' },
    ];
  }
}

export async function payOrder(orderId: string, method: PaymentMethodCode): Promise<{ redirectUrl?: string; success: boolean }> {
  if (!orderId) throw new Error('Thiếu mã đơn hàng');
  const payload = await axiosClient.post(`/orders/${orderId}/pay`, { method }) as Record<string, unknown>;
  return {
    success: true,
    redirectUrl: payload.redirectUrl as string | undefined,
  };
}
