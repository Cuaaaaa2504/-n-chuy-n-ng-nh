// src/components/seat/SeatItem.tsx

import React from 'react';
import type { SeatItemProps } from '../../types/seat.types'; // ✅ thêm type
import './SeatMap.css';

const SeatItem: React.FC<SeatItemProps> = ({
  seat,
  selected,
  onClick,
  disabled = false,
}) => {
  const isDisabled =
    disabled ||
    seat.status === 'SOLD' ||
    seat.status === 'HELD' ||
    seat.status === 'BLOCKED';

  const getTooltip = () => {
    if (selected) return 'Bỏ chọn ghế';
    switch (seat.status) {
      case 'HELD':     return 'Ghế đang được giữ';
      case 'SOLD':     return 'Ghế đã bán';
      case 'BLOCKED':  return 'Ghế bị khóa';
      case 'AVAILABLE': return 'Chọn ghế';
      default: return '';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    onClick();
  };

  const getStatusClass = () => {
    if (selected) return 'selected';
    return seat.status.toLowerCase();
  };

  return (
    <div
      className={`seat ${getStatusClass()} ${isDisabled ? 'disabled' : ''}`}
      onClick={handleClick}
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.85 : 1 }}
      title={getTooltip()}
      role="button"
      aria-disabled={isDisabled}
      aria-label={`Ghế ${seat.rowName}${seat.seatNumber} - ${seat.status}`}
    >
      <span className="seat-number">{seat.seatNumber}</span>
      {isDisabled && seat.status !== 'SELECTED' && (
        <span className="seat-status-icon">
          {seat.status === 'SOLD'    && '✕'}
          {seat.status === 'HELD'    && '⏳'}
          {seat.status === 'BLOCKED' && '⊘'}
        </span>
      )}
    </div>
  );
};

export default SeatItem;
