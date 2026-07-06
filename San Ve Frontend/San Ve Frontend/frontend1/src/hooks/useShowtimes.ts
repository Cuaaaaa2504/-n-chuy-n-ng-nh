// src/hooks/useShowtimes.ts
import { useState, useEffect } from 'react';

interface Showtime {
  id: number;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED';
}

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchShowtimes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data — replace with actual API call
      const mockData: Showtime[] = [
        { id: 1, movieTitle: 'Avengers Endgame', cinemaName: 'CGV Vincom',    roomName: 'Room 1', showDate: '2026-07-10', startTime: '19:30', endTime: '22:30', status: 'ACTIVE' },
        { id: 2, movieTitle: 'Avatar 2',          cinemaName: 'Lotte Cinema', roomName: 'Room 2', showDate: '2026-07-11', startTime: '20:00', endTime: '23:00', status: 'ACTIVE' },
      ];
      setShowtimes(mockData);
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const addShowtime = async (data: Omit<Showtime, 'id' | 'cinemaName' | 'status'>): Promise<boolean> => {
    try {
      const newShowtime: Showtime = {
        id: Date.now(),
        ...data,
        cinemaName: 'CGV Vincom',
        status: 'ACTIVE',
      };
      setShowtimes(prev => [...prev, newShowtime]);
      return true;
    } catch {
      setError('Không thể thêm suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  const updateShowtime = async (id: number, data: Partial<Showtime>): Promise<boolean> => {
    try {
      setShowtimes(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      return true;
    } catch {
      setError('Không thể cập nhật suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  const cancelShowtime = async (id: number): Promise<boolean> => {
    try {
      setShowtimes(prev => prev.map(item => item.id === id ? { ...item, status: 'CANCELLED' } : item));
      return true;
    } catch {
      setError('Không thể hủy suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  useEffect(() => { fetchShowtimes(); }, []);

  return { showtimes, loading, error, fetchShowtimes, addShowtime, updateShowtime, cancelShowtime };
};
