// src/components/PaymentPage/LoadingOverlay.jsx
import React from 'react';
import Spinner from '../common/Spinner';

const LoadingOverlay = ({ isVisible = false }) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <Spinner size="lg" />
        <h3 className="loading-title">Đang xử lý thanh toán...</h3>
        <p className="loading-description">Vui lòng không đóng trình duyệt</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;