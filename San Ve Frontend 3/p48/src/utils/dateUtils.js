// Format time from ISO string to localized time
export const formatTime = (dateTime) => {
  if (!dateTime) return '';
  try {
    return new Date(dateTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

// Format date from ISO string to localized date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Get unique available dates from showtimes
export const getAvailableDates = (showtimes) => {
  if (!showtimes || showtimes.length === 0) return [];
  
  const dateSet = new Set(
    showtimes.map(item => {
      try {
        return item.startTime.split('T')[0];
      } catch (error) {
        console.error('Error extracting date:', error);
        return null;
      }
    }).filter(date => date !== null)
  );
  
  return Array.from(dateSet).sort();
};

// Filter showtimes by date
export const filterShowtimesByDate = (showtimes, selectedDate) => {
  if (!showtimes || !selectedDate) return [];
  
  return showtimes.filter(item => {
    try {
      return item.startTime.startsWith(selectedDate);
    } catch (error) {
      console.error('Error filtering showtimes:', error);
      return false;
    }
  });
};

// Check if a showtime is in the past
export const isPastShowtime = (startTime) => {
  if (!startTime) return true;
  try {
    const now = new Date();
    const showtimeDate = new Date(startTime);
    return showtimeDate < now;
  } catch (error) {
    console.error('Error checking past showtime:', error);
    return true;
  }
};

// Get day name from date string
export const getDayName = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai';
    }
    return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  } catch (error) {
    console.error('Error getting day name:', error);
    return '';
  }
};