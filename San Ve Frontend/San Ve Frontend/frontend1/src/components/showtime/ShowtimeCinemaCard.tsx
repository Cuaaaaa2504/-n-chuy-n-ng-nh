// src/components/showtime/ShowtimeCinemaCard.tsx

import React, { useState } from 'react';
import ShowtimeButton from './ShowtimeButton';

interface Showtime {
  showtimeId: number;
  roomName: string;
  startTime: string;
  endTime: string;
}

interface ShowtimeCinemaCardProps {
  showtime: Showtime;
  formatTime: (dt: string) => string;
  onSelect: (id: number) => void;
}

const ShowtimeCinemaCard: React.FC<ShowtimeCinemaCardProps> = ({ showtime, formatTime, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isPast = new Date(showtime.startTime) < new Date();

  return (
    <div className="cinema-card">
      <div className="cinema-card-header" onClick={() => setIsExpanded(v => !v)}>
        <h4 className="room-name">{showtime.roomName}</h4>
        <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>
      {isExpanded && (
        <div className="cinema-card-body">
          <div className="showtime-times">
            <ShowtimeButton
              time={formatTime(showtime.startTime)}
              showtimeId={showtime.showtimeId}
              onSelect={onSelect}
              disabled={isPast}
            />
          </div>
          <div className="showtime-details">
            <span className="showtime-end">⏱ Kết thúc: {formatTime(showtime.endTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowtimeCinemaCard;
