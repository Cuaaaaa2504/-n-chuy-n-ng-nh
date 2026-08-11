
import { useState, useCallback } from 'react';
import { payOrder } from '../api/paymentApi'; // ✅ sửa path đúng
import type { PaymentMethodCode } from '../api/paymentApi';

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

interface PaymentData {
  bookingId: number | string;
  totalAmount: number;
  method?: PaymentMethodCode;
}

interface PaymentResult {
  status: PaymentStatus;
  redirectUrl?: string;
  paymentId?: string;
  transactionCode?: string;
}


export function getPaymentErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  if (err && typeof err === 'object') {
    const directMessage = (err as { message?: unknown }).message;
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage.trim();
    }

    const backendMessage = (
      err as {
        raw?: {
          response?: {
            data?: { message?: unknown };
          };
        };
      }
    ).raw?.response?.data?.message;

    if (Array.isArray(backendMessage)) {
      const joined = backendMessage.map(String).filter(Boolean).join(', ');
      if (joined) return joined;
    }

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage.trim();
    }
  }

  return 'Thanh toán thất bại';
}

export const usePayment = () => {
  const [isProcessing, setIsProcessing]   = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [error, setError]                 = useState<string | null>(null);

  const handlePayment = useCallback(
    async (paymentData: PaymentData): Promise<PaymentResult> => {
      try {
        setIsProcessing(true);
        setPaymentStatus('PROCESSING');
        setError(null);

        const result = await payOrder(
          String(paymentData.bookingId),
          paymentData.method ?? 'CASH'
        );

        if (result.success) {
          const nextStatus: PaymentStatus =
            result.status === 'PENDING' ? 'PENDING' : 'SUCCESS';
          setPaymentStatus(nextStatus);
          return {
            status: nextStatus,
            redirectUrl: result.redirectUrl,
            paymentId: result.paymentId,
            transactionCode: result.transactionCode,
          };
        }
        throw new Error('Payment failed');
      } catch (err: unknown) {
        const msg = getPaymentErrorMessage(err);
        setPaymentStatus('FAILED');
        setError(msg);
        throw new Error(msg, { cause: err });
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const resetPayment = useCallback(() => {
    setIsProcessing(false);
    setPaymentStatus('PENDING');
    setError(null);
  }, []);

  return { isProcessing, paymentStatus, error, handlePayment, resetPayment };
};
