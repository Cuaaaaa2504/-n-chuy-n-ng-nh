// src/hooks/usePayment.ts

import { useState, useCallback } from 'react';
import { paymentService } from '../api/paymentService';

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);

  const handlePayment = useCallback(async (paymentData: { bookingId: number; totalAmount: number }) => {
    try {
      setIsProcessing(true);
      setPaymentStatus('PROCESSING');
      setError(null);
      const result = await paymentService.processPayment(paymentData);
      if (result.status === 'SUCCESS') {
        setPaymentStatus('SUCCESS');
        return result;
      }
      throw new Error('Payment failed');
    } catch (err: any) {
      setPaymentStatus('FAILED');
      setError(err.message || 'Thanh toán thất bại');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetPayment = useCallback(() => {
    setIsProcessing(false);
    setPaymentStatus('PENDING');
    setError(null);
  }, []);

  return { isProcessing, paymentStatus, error, handlePayment, resetPayment };
};
