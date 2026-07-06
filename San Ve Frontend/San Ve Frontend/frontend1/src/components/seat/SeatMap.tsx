// src/components/seat/SeatMap.tsx
import React, { useMemo, useState } from 'react';
import { SeatMapProps, GroupedSeats } from '../../types/seat.types';
import SeatItem from './SeatItem';
import './SeatMap.css';

const SeatMap: React.FC<SeatMapProps> = ({
  seats, selectedSeats, onSeatSelect, maxSelectable = 10, showLegend = true
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const groupedSeats = useMemo((): GroupedSeats => {
    const groups: GroupedSeats = {};
    seats.forEach(seat => {
      if (!groups[seat.rowName]) groups[seat.rowName] = [];
      groups[seat.rowName].push(seat);
    });
    Object.keys(groups).forEach(row => groups[row].sort((a, b) => a.seatNumber - b.seatNumber));
    return groups;
  }, [seats]);

  const rowNames = useMemo(() => Object.keys(groupedSeats).sort(), [groupedSeats]);

  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || ['SOLD','HELD','BLOCKED'].includes(seat.status)) return;
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= maxSelectable) {
      alert(`Bạn chỉ có thể chọn tối đa ${maxSelectable} ghế`);
      return;
    }
    onSeatSelect(seatId);
  };

  const stats = {
    available: seats.filter(s => s.status === 'AVAILABLE').length,
    sold:      seats.filter(s => s.status === 'SOLD').length,
  };

  return (
    <div className="seat-map-wrapper">
      <div className="seat-map-header">
        <h2 className="seat-map-title">Sơ đồ ghế</h2>
        <div className="seat-stats">
          <span className="stat-item available"><span className="stat-dot"></span>Trống: {stats.available}</span>
          <span className="stat-item selected"><span className="stat-dot"></span>Đã chọn: {selectedSeats.length}</span>
          <span className="stat-item sold"><span className="stat-dot"></span>Đã bán: {stats.sold}</span>
        </div>
      </div>

      <div className="seat-map-container">
        <div className="screen-container">
          <div className="screen"><span>MÀN HÌNH</span></div>
        </div>
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
                {groupedSeats[rowName].map(seat => (
                  <SeatItem
                    key={seat.id}
                    seat={seat}
                    selected={selectedSeats.includes(seat.id)}
                    onClick={() => handleSeatClick(seat.id)}
                    disabled={['SOLD','HELD','BLOCKED'].includes(seat.status)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showLegend && (
        <div className="seat-legend">
          <div className="legend-title">Chú thích:</div>
          <div className="legend-items">
            {[['available','Trống'],['selected','Đã chọn'],['held','Đang giữ'],['sold','Đã bán'],['blocked','Bị khóa']].map(([cls, label]) => (
              <div key={cls} className="legend-item">
                <div className={`legend-color ${cls}`}></div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
