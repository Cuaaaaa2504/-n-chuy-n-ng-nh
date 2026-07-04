// src/App.tsx

import React, { useState, useEffect } from 'react';
import SeatMap from './components/seat/SeatMap';
import { SeatDto } from './types/seat.types';
import { seatService } from './services/seat.service';
import { useSeatSelection } from './hooks/useSeatSelection';
import './App.css';

const App: React.FC = () => {
  const [seats, setSeats] = useState<SeatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showtimeId] = useState('123'); // Replace with actual showtime ID

  const {
    selectedSeats,
    toggleSeat,
    clearSelection,
    getSelectedCount,
    getSelectedSeats
  } = useSeatSelection({
    maxSelectable: 8,
    initialSelected: []
  });

  useEffect(() => {
    loadSeats();
  }, [showtimeId]);

  const loadSeats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await seatService.getSeatsByShowtime(showtimeId);
      setSeats(data);
    } catch (err) {
      setError('Không thể tải sơ đồ ghế. Vui lòng thử lại.');
      console.error('Load seats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelect = (seatId: number) => {
    toggleSeat(seatId, seats);
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }

    try {
      const selectedSeatData = getSelectedSeats(seats);
      console.log('Booking seats:', selectedSeatData);
      
      // Call booking API
      // await seatService.bookSeats(showtimeId, selectedSeats);
      
      alert(`Đặt vé thành công! Bạn đã chọn ${selectedSeats.length} ghế.`);
      clearSelection();
    } catch (error) {
      alert('Có lỗi xảy ra khi đặt vé. Vui lòng thử lại.');
    }
  };

  const handleClearSelection = () => {
    if (selectedSeats.length > 0 && window.confirm('Bạn có chắc muốn bỏ chọn tất cả?')) {
      clearSelection();
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang tải sơ đồ ghế...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p className="error-message">{error}</p>
          <button onClick={loadSeats} className="retry-button">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 Đặt vé xem phim</h1>
        <p className="app-subtitle">Chọn ghế ngồi của bạn</p>
      </header>

      <main className="app-main">
        <SeatMap
          seats={seats}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
          maxSelectable={8}
          showLegend={true}
        />
      </main>

      <footer className="app-footer">
        <div className="booking-summary">
          <div className="summary-info">
            <div className="selected-count">
              <span className="label">Ghế đã chọn:</span>
              <span className="count">{getSelectedCount()}</span>
              <span className="max">/ 8</span>
            </div>
            <div className="selected-list">
              {getSelectedSeats(seats).map(seat => (
                <span key={seat.id} className="selected-seat-tag">
                  {seat.rowName}{seat.seatNumber}
                </span>
              ))}
            </div>
          </div>
          <div className="summary-actions">
            <button
              className="btn btn-clear"
              onClick={handleClearSelection}
              disabled={selectedSeats.length === 0}
            >
              Bỏ chọn
            </button>
            <button
              className="btn btn-book"
              onClick={handleBooking}
              disabled={selectedSeats.length === 0}
            >
              Đặt vé ({getSelectedCount()})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;