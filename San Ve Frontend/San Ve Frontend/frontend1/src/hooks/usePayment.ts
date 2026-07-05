// src/hooks/usePayment.ts

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
          setPaymentStatus('SUCCESS');
          return { status: 'SUCCESS', redirectUrl: result.redirectUrl };
        }
        throw new Error('Payment failed');
      } catch (err: unknown) { // ✅ thay any → unknown
        const msg = err instanceof Error ? err.message : 'Thanh toán thất bại';
        setPaymentStatus('FAILED');
        setError(msg);
        throw err;
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
