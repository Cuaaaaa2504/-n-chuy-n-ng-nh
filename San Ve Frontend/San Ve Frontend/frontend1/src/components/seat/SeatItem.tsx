// src/components/seat/SeatItem.tsx
import React from 'react';
import { SeatItemProps } from '../../types/seat.types';
import './SeatMap.css';

const SeatItem: React.FC<SeatItemProps> = ({ seat, selected, onClick, disabled = false }) => {
  const isDisabled = disabled || ['SOLD','HELD','BLOCKED'].includes(seat.status);

  const getTooltip = () => {
    if (selected) return 'Bỏ chọn ghế';
    const map: Record<string, string> = { HELD: 'Ghế đang được giữ', SOLD: 'Ghế đã bán', BLOCKED: 'Ghế bị khóa', AVAILABLE: 'Chọn ghế' };
    return map[seat.status] ?? '';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) onClick();
  };

  const getStatusClass = () => selected ? 'selected' : seat.status.toLowerCase();

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
          {seat.status === 'SOLD' && '✕'}
          {seat.status === 'HELD' && '⏳'}
          {seat.status === 'BLOCKED' && '⊘'}
        </span>
      )}
    </div>
  );
};

export default SeatItem;