// src/components/seat/SeatMap.tsx
import React, { useMemo, useState } from 'react';
import type { SeatMapProps, GroupedSeats, SeatId } from '../../types/seat.types';
import { UNSELECTABLE_STATUSES } from '../../types/seat.types';
import SeatItem from './SeatItem';
import './SeatMap.css';

const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedIds,
  onSeatToggle,
  maxSeats = 10,
  heldIds,
  showLegend = true,
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const selected = useMemo(() => selectedIds ?? new Set<string>(), [selectedIds]);

  const groupedSeats = useMemo((): GroupedSeats => {
    const groups: GroupedSeats = {};
    seats.forEach((seat) => {
      if (!groups[seat.rowName]) groups[seat.rowName] = [];
      groups[seat.rowName].push(seat);
    });
    Object.keys(groups).forEach((row) =>
      groups[row].sort((a, b) => a.seatNumber - b.seatNumber),
    );
    return groups;
  }, [seats]);

  const rowNames = useMemo(() => Object.keys(groupedSeats).sort(), [groupedSeats]);

  const isDisabled = (seatId: SeatId, status: string): boolean =>
    UNSELECTABLE_STATUSES.includes(status as never) || (heldIds?.has(String(seatId)) ?? false);

  const isSelected = (seatId: SeatId): boolean => selected.has(String(seatId));

  // FIX: giữ nguyên id (number | string), KHÔNG ép Number() — id mock dạng "A1" sẽ thành NaN
  const handleSeatClick = (seatId: SeatId) => {
    const seat = seats.find((s) => String(s.id) === String(seatId));
    if (!seat || isDisabled(seat.id, seat.status)) return;

    const key = String(seat.id);
    if (!selected.has(key) && selected.size >= maxSeats) {
      setWarning(`Bạn chỉ có thể chọn tối đa ${maxSeats} ghế`);
      return;
    }
    setWarning(null);
    onSeatToggle?.(key);
  };

  const stats = {
    available: seats.filter((s) => s.status === 'AVAILABLE').length,
    sold: seats.filter((s) => s.status === 'SOLD').length,
  };

  return (
    <div className="seat-map-wrapper">
      <div className="seat-map-header">
        <h2 className="seat-map-title">Sơ đồ ghế</h2>
        <div className="seat-stats">
          <span className="stat-item available"><span className="stat-dot"></span>Trống: {stats.available}</span>
          <span className="stat-item selected"><span className="stat-dot"></span>Đã chọn: {selected.size}</span>
          <span className="stat-item sold"><span className="stat-dot"></span>Đã bán: {stats.sold}</span>
        </div>
      </div>

      {warning && (
        <p className="text-sm text-amber-500 mb-2" role="alert">{warning}</p>
      )}

      <div className="seat-map-container">
        <div className="screen-container">
          <div className="screen"><span>MÀN HÌNH</span></div>
        </div>
        <div className="seat-map">
          {rowNames.map((rowName) => (
            <div
              key={rowName}
              className={`seat-row ${hoveredRow === rowName ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredRow(rowName)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="row-label">{rowName}</div>
              <div className="seats-container">
                {groupedSeats[rowName].map((seat) => (
                  <SeatItem
                    key={String(seat.id)}
                    seat={seat}
                    selected={isSelected(seat.id)}
                    onClick={() => handleSeatClick(seat.id)}
                    disabled={isDisabled(seat.id, seat.status)}
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
            {[['available', 'Trống'], ['selected', 'Đã chọn'], ['held', 'Đang giữ'], ['sold', 'Đã bán'], ['blocked', 'Bị khóa']].map(([cls, label]) => (
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
