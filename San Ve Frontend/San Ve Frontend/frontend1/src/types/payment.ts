export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'MOMO' | 'VNPAY' | 'ZALOPAY';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface CreatePaymentRequest {
  bookingId: number;
  method: PaymentMethod;
  returnUrl?: string;
}

export interface PaymentResult {
  payment: Payment;
  redirectUrl?: string;
  qrCode?: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  CREDIT_CARD: 'Thẻ tín dụng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPay',
  ZALOPAY: 'ZaloPay',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  SUCCESS: 'text-green-400 bg-green-400/10',
  FAILED: 'text-red-400 bg-red-400/10',
  REFUNDED: 'text-blue-400 bg-blue-400/10',
};
