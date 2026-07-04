// src/components/PaymentPage/OrderSummary.jsx
import React from 'react';
import { 
  FilmIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  TagIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatTime } from '../../utils/formatters';

const OrderSummary = ({ order }) => {
  const { movie, cinema, showtime, seats } = order;

  return (
    <div className="order-summary">
      {/* Movie Info */}
      <section className="summary-section">
        <div className="section-header">
          <FilmIcon className="section-icon" />
          <h2 className="section-title">Thông tin phim</h2>
        </div>
        <div className="movie-info">
          <div className="movie-poster">
            <img src={movie.poster} alt={movie.name} />
          </div>
          <div className="movie-details">
            <h3 className="movie-title">{movie.name}</h3>
            <div className="movie-meta">
              <span className="meta-tag">
                <ClockIcon className="meta-icon" />
                {movie.duration} phút
              </span>
              <span className="meta-tag">{movie.genre}</span>
              {movie.ageRestriction && (
                <span className="meta-tag meta-tag--age">
                  {movie.ageRestriction}
                </span>
              )}
            </div>
            {movie.description && (
              <p className="movie-description">{movie.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* Cinema & Showtime */}
      <section className="summary-section">
        <div className="section-header">
          <MapPinIcon className="section-icon" />
          <h2 className="section-title">Địa điểm & Suất chiếu</h2>
        </div>
        <div className="cinema-info">
          <div className="cinema-details">
            <h4 className="cinema-name">{cinema.name}</h4>
            <p className="cinema-address">{cinema.address}</p>
            <p className="cinema-room">Phòng: {cinema.room}</p>
          </div>
          <div className="showtime-info">
            <div className="showtime-item">
              <CalendarIcon className="showtime-icon" />
              <span>{formatDate(showtime.date)}</span>
            </div>
            <div className="showtime-item">
              <ClockIcon className="showtime-icon" />
              <span>{formatTime(showtime.date)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Seats */}
      <section className="summary-section">
        <div className="section-header">
          <TagIcon className="section-icon" />
          <h2 className="section-title">Ghế đã chọn</h2>
        </div>
        <div className="seats-grid">
          {seats.map((seat) => (
            <div key={seat.id} className="seat-item">
              <span className="seat-label">{seat.id}</span>
              <span className="seat-price">{formatCurrency(seat.price)}</span>
            </div>
          ))}
        </div>
        <div className="seats-total">
          <span>Tổng: {seats.length} ghế</span>
          <span>{formatCurrency(seats.reduce((sum, s) => sum + s.price, 0))}</span>
        </div>
      </section>
    </div>
  );
};

export default OrderSummary;