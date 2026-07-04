import React, { useState } from 'react';
import ShowtimeButton from './ShowtimeButton';
import '../styles/ShowtimeCinemaCard.css';

const ShowtimeCinemaCard = ({ showtime, formatTime, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isPastShowtime = () => {
    const now = new Date();
    const showtimeDate = new Date(showtime.startTime);
    return showtimeDate < now;
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="cinema-card">
      <div className="cinema-card-header" onClick={toggleExpand}>
        <div className="cinema-info">
          <h4 className="room-name">{showtime.roomName}</h4>
        </div>
        <div className="cinema-card-actions">
          <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="cinema-card-body">
          <div className="showtime-times">
            <ShowtimeButton
              time={formatTime(showtime.startTime)}
              showtimeId={showtime.showtimeId}
              onSelect={onSelect}
              disabled={isPastShowtime()}
            />
          </div>
          <div className="showtime-details">
            <span className="showtime-end">
              ⏱ Kết thúc: {formatTime(showtime.endTime)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowtimeCinemaCard;