// src/components/PaymentPage/index.jsx
import React, { useState, useEffect } from 'react';
import OrderSummary from './OrderSummary';
import PaymentStatus from './PaymentStatus';
import PaymentButton from './PaymentButton';
import LoadingOverlay from './LoadingOverlay';
import { usePayment } from '../../hooks/usePayment';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import './styles.css';

const PaymentPage = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const {
    isProcessing,
    paymentStatus,
    handlePayment,
    resetPayment
  } = usePayment();

  // Mock booking ID - trong thực tế lấy từ URL params hoặc context
  const bookingId = 15;

  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        // Giả lập gọi API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data - sẽ thay thế bằng API call thực tế
        const mockOrder = {
          id: bookingId,
          movie: {
            name: "Avengers: Endgame",
            poster: "https://via.placeholder.com/300x450/1a1a2e/ffffff?text=Avengers",
            duration: 181,
            genre: "Action, Adventure, Sci-Fi",
            ageRestriction: "16+",
            description: "Cuộc chiến cuối cùng của các Avengers chống lại Thanos."
          },
          cinema: {
            name: "CGV Vincom Center",
            address: "72 Lê Thánh Tôn, Quận 1, TP.HCM",
            room: "Cinema 05"
          },
          showtime: {
            date: "2026-06-18T20:00:00",
            dateFormatted: "18/06/2026",
            timeFormatted: "20:00"
          },
          seats: [
            { id: "A1", row: "A", number: 1, price: 90000 },
            { id: "A2", row: "A", number: 2, price: 90000 },
            { id: "A3", row: "A", number: 3, price: 90000 }
          ],
          totalPrice: 270000,
          status: "PENDING",
          createdAt: "2026-06-18T15:30:00"
        };
        
        setOrder(mockOrder);
        setError(null);
      } catch (err) {
        setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
        console.error('Fetch order error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [bookingId]);

  // Xử lý thanh toán
  const onPaymentSubmit = async () => {
    if (!order) return;
    
    try {
      const result = await handlePayment({
        bookingId: order.id,
        totalAmount: order.totalPrice
      });
      
      // Có thể xử lý thêm sau khi thanh toán thành công
      if (result.status === 'SUCCESS') {
        // Ví dụ: gửi email, hiển thị thông báo, v.v.
        console.log('Payment successful!');
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  // Reset trạng thái thanh toán
  const handleReset = () => {
    resetPayment();
    setError(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="payment-page payment-page--loading">
        <div className="payment-skeleton">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !order) {
    return (
      <div className="payment-page payment-page--error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Không tìm thấy đơn hàng</h2>
          <p>{error || 'Đơn hàng không tồn tại hoặc đã bị hủy.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Success state - hiển thị thông báo thành công
  if (paymentStatus === 'SUCCESS') {
    return (
      <div className="payment-page">
        <LoadingOverlay isVisible={false} />
        <div className="payment-success">
          <div className="success-icon">✅</div>
          <h2>Thanh toán thành công!</h2>
          <p>Vé xem phim của bạn đã được đặt.</p>
          <div className="success-details">
            <p><strong>Mã đơn hàng:</strong> #{order.id}</p>
            <p><strong>Phim:</strong> {order.movie.name}</p>
            <p><strong>Suất chiếu:</strong> {formatDate(order.showtime.date)} - {formatTime(order.showtime.date)}</p>
            <p><strong>Ghế:</strong> {order.seats.map(s => s.id).join(', ')}</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isProcessing} />

      <div className="payment-container">
        {/* Header */}
        <header className="payment-header">
          <h1 className="payment-title">
            <span className="icon">🎬</span>
            Thanh toán vé xem phim
          </h1>
          <p className="payment-subtitle">Vui lòng kiểm tra thông tin trước khi thanh toán</p>
        </header>

        {/* Payment Status */}
        <PaymentStatus status={paymentStatus} />

        <div className="payment-grid">
          {/* Main Content - Order Summary */}
          <div className="payment-main">
            <OrderSummary order={order} />
          </div>

          {/* Sidebar - Payment */}
          <div className="payment-sidebar">
            <div className="payment-card payment-card--sticky">
              <div className="payment-card-header">
                <h3 className="payment-card-title">Tóm tắt đơn hàng</h3>
              </div>
              
              <div className="payment-card-body">
                <div className="summary-item">
                  <span className="summary-label">Phim</span>
                  <span className="summary-value">{order.movie.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Suất chiếu</span>
                  <span className="summary-value">
                    {formatDate(order.showtime.date)} - {formatTime(order.showtime.date)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Rạp</span>
                  <span className="summary-value">{order.cinema.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Phòng</span>
                  <span className="summary-value">{order.cinema.room}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Ghế</span>
                  <span className="summary-value summary-seats">
                    {order.seats.map(seat => (
                      <span key={seat.id} className="seat-badge">
                        {seat.id}
                      </span>
                    ))}
                  </span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-price">
                  <div className="price-detail">
                    <span>{order.seats.length} ghế × {formatCurrency(order.seats[0].price)}</span>
                    <span>{formatCurrency(order.seats.reduce((sum, s) => sum + s.price, 0))}</span>
                  </div>
                  <div className="price-total">
                    <span className="total-label">Tổng tiền</span>
                    <span className="total-amount">{formatCurrency(order.totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="payment-card-footer">
                <PaymentButton 
                  onClick={onPaymentSubmit}
                  isLoading={isProcessing}
                  status={paymentStatus}
                />
                
                {paymentStatus === 'FAILED' && (
                  <div className="error-message">
                    <p>Thanh toán thất bại. Vui lòng thử lại.</p>
                    <button 
                      onClick={handleReset}
                      className="btn btn-outline btn-sm"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;