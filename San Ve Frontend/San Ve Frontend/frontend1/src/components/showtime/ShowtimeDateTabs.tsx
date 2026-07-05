// src/components/showtime/ShowtimeDateTabs.tsx

import React from 'react';

interface ShowtimeDateTabsProps {
  dates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  formatDate: (date: string) => string;
}

const getDayName = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === tomorrow.toDateString()) return 'Ngày mai';
  return date.toLocaleDateString('vi-VN', { weekday: 'short' });
};

const ShowtimeDateTabs: React.FC<ShowtimeDateTabsProps> = ({ dates, selectedDate, onDateSelect, formatDate }) => {
  if (dates.length === 0) return null;
  return (
    <div className="date-tabs-container">
      <div className="date-tabs">
        {dates.map(date => (
          <button
            key={date}
            className={`date-tab ${selectedDate === date ? 'active' : ''}`}
            onClick={() => onDateSelect(date)}
          >
            <span className="day-name">{getDayName(date)}</span>
            <span className="date-number">{formatDate(date)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShowtimeDateTabs;
