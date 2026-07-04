import React from 'react';
import '../styles/ShowtimeButton.css';

const ShowtimeButton = ({ 
  time, 
  showtimeId, 
  onSelect, 
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled) {
      onSelect(showtimeId);
    }
  };

  return (
    <button
      className={`showtime-btn ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="time-display">{time}</span>
      {!disabled && <span className="badge available">Còn vé</span>}
      {disabled && <span className="badge expired">Đã qua</span>}
    </button>
  );
};

export default ShowtimeButton;