// src/components/showtime/ShowtimeButton.tsx

import React from 'react';

interface ShowtimeButtonProps {
  time: string;
  showtimeId: number;
  onSelect: (id: number) => void;
  disabled?: boolean;
}

const ShowtimeButton: React.FC<ShowtimeButtonProps> = ({ time, showtimeId, onSelect, disabled = false }) => (
  <button
    className={`showtime-btn ${disabled ? 'disabled' : ''}`}
    onClick={() => !disabled && onSelect(showtimeId)}
    disabled={disabled}
  >
    <span className="time-display">{time}</span>
    {!disabled && <span className="badge available">Còn vé</span>}
    {disabled && <span className="badge expired">Đã qua</span>}
  </button>
);

export default ShowtimeButton;
