import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/SeatSelectionPage.css';

const SeatSelectionPage = () => {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showtimeInfo, setShowtimeInfo] = useState(null);

  useEffect(() => {
    // Simulate loading seat data
    const timer = setTimeout(() => {
      setLoading(false);
      setShowtimeInfo({
        id: showtimeId,
        movieTitle: 'Avengers Endgame',
        cinemaName: 'CGV Vincom',
        roomName: 'Phòng 01',
        startTime: '2026-06-15T09:00:00'
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [showtimeId]);

  if (loading) {
    return (
      <div className="seat-loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải sơ đồ ghế...</p>
      </div>
    );
  }

  return (
    <div className="seat-selection-page">
      <div className="seat-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Quay lại
        </button>
        <h2>Chọn ghế</h2>
      </div>
      
      <div className="seat-info">
        <p><strong>Phim:</strong> {showtimeInfo?.movieTitle}</p>
        <p><strong>Rạp:</strong> {showtimeInfo?.cinemaName}</p>
        <p><strong>Phòng:</strong> {showtimeInfo?.roomName}</p>
        <p><strong>Suất:</strong> {new Date(showtimeInfo?.startTime).toLocaleString('vi-VN')}</p>
      </div>

      <div className="seat-map-placeholder">
        <div className="screen">MÀN HÌNH</div>
        <div className="seats-grid">
          {/* Placeholder for seat selection UI */}
          <div className="seat-row">
            {['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'].map(seat => (
              <div key={seat} className="seat available">
                {seat}
              </div>
            ))}
          </div>
          <div className="seat-row">
            {['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'].map(seat => (
              <div key={seat} className="seat available">
                {seat}
              </div>
            ))}
          </div>
          <div className="seat-row">
            {['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'].map(seat => (
              <div key={seat} className="seat booked">
                {seat}
              </div>
            ))}
          </div>
          <div className="seat-row">
            {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].map(seat => (
              <div key={seat} className="seat available">
                {seat}
              </div>
            ))}
          </div>
        </div>
        <div className="seat-legend">
          <span><span className="legend-box available"></span> Còn trống</span>
          <span><span className="legend-box booked"></span> Đã đặt</span>
          <span><span className="legend-box selected"></span> Đang chọn</span>
        </div>
      </div>

      <div className="seat-actions">
        <button className="confirm-btn" disabled>
          Xác nhận đặt vé
        </button>
      </div>
    </div>
  );
};

export default SeatSelectionPage;