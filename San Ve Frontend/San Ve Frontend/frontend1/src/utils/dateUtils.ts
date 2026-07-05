// src/utils/dateUtils.ts

export const formatTime = (dateTime: string): string => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const getAvailableDates = (showtimes: { startTime: string }[]): string[] => {
  if (!showtimes?.length) return [];
  return Array.from(new Set(showtimes.map(s => s.startTime.split('T')[0]))).sort();
};

export const filterShowtimesByDate = (showtimes: { startTime: string }[], selectedDate: string | null): any[] => {
  if (!showtimes || !selectedDate) return [];
  return showtimes.filter(s => s.startTime.startsWith(selectedDate));
};

export const isPastShowtime = (startTime: string): boolean => {
  if (!startTime) return true;
  return new Date(startTime) < new Date();
};
