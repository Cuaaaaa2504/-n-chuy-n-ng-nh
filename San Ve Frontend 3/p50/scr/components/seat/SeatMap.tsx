// src/components/seat/SeatMap.tsx

import React, { useMemo, useState } from 'react';
import { SeatMapProps, GroupedSeats } from '../../types/seat.types';
import SeatItem from './SeatItem';
import './SeatMap.css';

const SeatMap: React.FC<SeatMapProps> = ({ 
  seats, 
  selectedSeats, 
  onSeatSelect,
  maxSelectable = 10,
  showLegend = true
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Group and sort seats
  const groupedSeats = useMemo((): GroupedSeats => {
    const groups: GroupedSeats = {};
    
    seats.forEach(seat => {
      if (!groups[seat.rowName]) {
        groups[seat.rowName] = [];
      }
      groups[seat.rowName].push(seat);
    });

    // Sort seats within each row
    Object.keys(groups).forEach(row => {
      groups[row].sort((a, b) => a.seatNumber - b.seatNumber);
    });

    return groups;
  }, [seats]);

  // Get sorted row names
  const rowNames = useMemo(() => {
    return Object.keys(groupedSeats).sort();
  }, [groupedSeats]);

  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    // Check if seat is selectable
    if (seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') {
      return;
    }

    // Check max selectable
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= maxSelectable) {
      alert(`Bạn chỉ có thể chọn tối đa ${maxSelectable} ghế`);
      return;
    }

    onSeatSelect(seatId);
  };

  const getTotalSeats = () => {
    const total = seats.length;
    const available = seats.filter(s => s.status === 'AVAILABLE').length;
    const sold = seats.filter(s => s.status === 'SOLD').length;
    const held = seats.filter(s => s.status === 'HELD').length;
    const blocked = seats.filter(s => s.status === 'BLOCKED').length;
    return { total, available, sold, held, blocked };
  };

  const stats = getTotalSeats();

  return (
    <div className="seat-map-wrapper">
      <div className="seat-map-header">
        <h2 className="seat-map-title">Sơ đồ ghế</h2>
        <div className="seat-stats">
          <span className="stat-item available">
            <span className="stat-dot"></span>
            Trống: {stats.available}
          </span>
          <span className="stat-item selected">
            <span className="stat-dot"></span>
            Đã chọn: {selectedSeats.length}
          </span>
          <span className="stat-item sold">
            <span className="stat-dot"></span>
            Đã bán: {stats.sold}
          </span>
        </div>
      </div>

      <div className="seat-map-container">
        {/* Screen */}
        <div className="screen-container">
          <div className="screen">
            <span>MÀN HÌNH</span>
          </div>
        </div>

        {/* Seats */}
        <div className="seat-map">
          {rowNames.map(rowName => (
            <div 
              key={rowName} 
              className={`seat-row ${hoveredRow === rowName ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredRow(rowName)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="row-label">{rowName}</div>
              <div className="seats-container">
                {groupedSeats[rowName].map(seat => {
                  const isSelected = selectedSeats.includes(seat.id);
                  const isDisabled = seat.status === 'SOLD' || 
                                   seat.status === 'HELD' || 
                                   seat.status === 'BLOCKED';

                  return (
                    <SeatItem
                      key={seat.id}
                      seat={seat}
                      selected={isSelected}
                      onClick={() => handleSeatClick(seat.id)}
                      disabled={isDisabled}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="seat-legend">
          <div className="legend-title">Chú thích:</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>Trống</span>
            </div>
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>Đã chọn</span>
            </div>
            <div className="legend-item">
              <div className="legend-color held"></div>
              <span>Đang giữ</span>
            </div>
            <div className="legend-item">
              <div className="legend-color sold"></div>
              <span>Đã bán</span>
            </div>
            <div className="legend-item">
              <div className="legend-color blocked"></div>
              <span>Bị khóa</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;