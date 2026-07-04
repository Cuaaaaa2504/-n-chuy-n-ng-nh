// src/components/PaymentPage/PaymentButton.jsx
import React from 'react';
import Spinner from '../common/Spinner';

const PaymentButton = ({ 
  onClick, 
  isLoading = false, 
  status = 'PENDING',
  disabled = false 
}) => {
  const getButtonText = () => {
    if (status === 'SUCCESS') {
      return '✓ Đã thanh toán';
    }
    if (isLoading) {
      return (
        <span className="btn-loading-content">
          <Spinner size="sm" />
          Đang xử lý...
        </span>
      );
    }
    return 'Thanh toán ngay';
  };

  const isDisabled = disabled || isLoading || status === 'SUCCESS';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`payment-btn ${isDisabled ? 'payment-btn--disabled' : ''}`}
    >
      {getButtonText()}
    </button>
  );
};

export default PaymentButton;