// src/hooks/usePayment.js
import { useState, useCallback } from 'react';
import { paymentService } from '../services/paymentService';

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [error, setError] = useState(null);

  const handlePayment = useCallback(async (paymentData) => {
    try {
      setIsProcessing(true);
      setPaymentStatus('PROCESSING');
      setError(null);

      // Gọi API thanh toán
      const result = await paymentService.processPayment(paymentData);

      if (result.status === 'SUCCESS') {
        setPaymentStatus('SUCCESS');
        return result;
      } else {
        throw new Error('Payment failed');
      }
    } catch (err) {
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

  return {
    isProcessing,
    paymentStatus,
    error,
    handlePayment,
    resetPayment
  };
};