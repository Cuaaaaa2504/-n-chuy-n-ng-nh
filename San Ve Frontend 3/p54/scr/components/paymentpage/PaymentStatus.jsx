// src/components/PaymentPage/PaymentStatus.jsx
import React from 'react';
import {
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const PaymentStatus = ({ status = 'PENDING' }) => {
  const statusConfig = {
    PENDING: {
      icon: ClockIcon,
      text: 'Đang chờ thanh toán',
      className: 'status-pending',
      description: 'Vui lòng hoàn tất thanh toán để xác nhận đặt vé.'
    },
    PROCESSING: {
      icon: ExclamationCircleIcon,
      text: 'Đang xử lý thanh toán...',
      className: 'status-processing',
      description: 'Hệ thống đang xử lý giao dịch của bạn.'
    },
    SUCCESS: {
      icon: CheckCircleIcon,
      text: 'Thanh toán thành công',
      className: 'status-success',
      description: 'Bạn đã thanh toán thành công. Vé sẽ được gửi đến email của bạn.'
    },
    FAILED: {
      icon: XCircleIcon,
      text: 'Thanh toán thất bại',
      className: 'status-failed',
      description: 'Giao dịch thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
    }
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className={`payment-status ${config.className}`}>
      <div className="status-content">
        <div className="status-icon-wrapper">
          <Icon className={`status-icon ${status === 'PROCESSING' ? 'status-icon--spin' : ''}`} />
        </div>
        <div className="status-text">
          <h3 className="status-title">{config.text}</h3>
          <p className="status-description">{config.description}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;