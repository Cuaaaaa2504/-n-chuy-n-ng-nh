// src/hooks/useShowtimes.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface Showtime {
  id: number;
  movieId: string;
  roomId: string;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED';
}

export type { Showtime };

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Stable ref to avoid stale closure without triggering effect re-runs
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchShowtimes = useCallback(async () => {
    // Mock data — replace with actual API call
    const mockData: Showtime[] = [
      { id: 1, movieId: '1', roomId: '1', movieTitle: 'Avengers Endgame', cinemaName: 'CGV Vincom',    roomName: 'Room 1', showDate: '2026-07-10', startTime: '19:30', endTime: '22:30', status: 'ACTIVE' },
      { id: 2, movieId: '2', roomId: '2', movieTitle: 'Avatar 2',          cinemaName: 'Lotte Cinema', roomName: 'Room 2', showDate: '2026-07-11', startTime: '20:00', endTime: '23:00', status: 'ACTIVE' },
    ];
    return mockData;
  }, []);

  const addShowtime = async (data: { movieId: string; roomId: string; showDate: string; startTime: string; endTime: string }): Promise<boolean> => {
    try {
      const movieTitleMap: Record<string, string> = { '1': 'Avengers Endgame', '2': 'Avatar 2', '3': 'Spider-Man' };
      const roomNameMap: Record<string, string>   = { '1': 'Room 1', '2': 'Room 2', '3': 'Room 3' };
      const newShowtime: Showtime = {
        id: Date.now(),
        movieId: data.movieId,
        roomId: data.roomId,
        movieTitle: movieTitleMap[data.movieId] ?? 'Unknown',
        cinemaName: 'CGV Vincom',
        roomName: roomNameMap[data.roomId] ?? 'Unknown',
        showDate: data.showDate,
        startTime: data.startTime,
        endTime: data.endTime,
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

  // Subscribe to data on mount — setState called inside the async callback,
  // not synchronously in the effect body, so no cascading-render warning.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchShowtimes()
      .then(data => {
        if (!cancelled) setShowtimes(data);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchShowtimes]);

  return { showtimes, loading, error, fetchShowtimes, addShowtime, updateShowtime, cancelShowtime };
};
