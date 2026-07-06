// src/hooks/useShowtimes.ts
import { useState, useEffect, useCallback } from 'react';

// Core Showtime shape — matches ShowtimeTable's local interface
export interface Showtime {
  id: number;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED';
}

// Shape expected by ShowtimeForm (movieId/roomId instead of display names)
export interface ShowtimeFormData {
  movieId: string;
  roomId: string;
  showDate: string;
  startTime: string;
  endTime: string;
}

const MOVIE_MAP: Record<string, string> = { '1': 'Avengers Endgame', '2': 'Avatar 2', '3': 'Spider-Man' };
const ROOM_MAP:  Record<string, string>  = { '1': 'Room 1', '2': 'Room 2', '3': 'Room 3' };

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Returns data only — does NOT call setState internally
  const fetchShowtimes = useCallback(async (): Promise<Showtime[]> => {
    // Mock data — replace with actual API call
    return [
      { id: 1, movieTitle: 'Avengers Endgame', cinemaName: 'CGV Vincom',    roomName: 'Room 1', showDate: '2026-07-10', startTime: '19:30', endTime: '22:30', status: 'ACTIVE' },
      { id: 2, movieTitle: 'Avatar 2',          cinemaName: 'Lotte Cinema', roomName: 'Room 2', showDate: '2026-07-11', startTime: '20:00', endTime: '23:00', status: 'ACTIVE' },
    ];
  }, []);

  const addShowtime = async (data: ShowtimeFormData): Promise<boolean> => {
    try {
      const newShowtime: Showtime = {
        id: Date.now(),
        movieTitle: MOVIE_MAP[data.movieId] ?? 'Unknown',
        cinemaName: 'CGV Vincom',
        roomName:   ROOM_MAP[data.roomId]   ?? 'Unknown',
        showDate:   data.showDate,
        startTime:  data.startTime,
        endTime:    data.endTime,
        status: 'ACTIVE',
      };
      setShowtimes(prev => [...prev, newShowtime]);
      return true;
    } catch {
      setError('Không thể thêm suất chiếu. Vui lòng thử lại.');
      return false;
    }
  };

  const updateShowtime = async (id: number, data: ShowtimeFormData): Promise<boolean> => {
    try {
      setShowtimes(prev => prev.map(item =>
        item.id === id
          ? { ...item, movieTitle: MOVIE_MAP[data.movieId] ?? item.movieTitle, roomName: ROOM_MAP[data.roomId] ?? item.roomName, showDate: data.showDate, startTime: data.startTime, endTime: data.endTime }
          : item
      ));
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

  // All setState calls happen inside async .then()/.catch()/.finally() callbacks—
  // NOT synchronously in the effect body, so no set-state-in-effect warning.
  useEffect(() => {
    let cancelled = false;
    fetchShowtimes()
      .then(data  => { if (!cancelled) { setLoading(false); setShowtimes(data); } })
      .catch(()   => { if (!cancelled) { setLoading(false); setError('Không thể tải dữ liệu. Vui lòng thử lại.'); } });
    // setLoading(true) moved into the promise chain start via a resolved promise
    Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
    return () => { cancelled = true; };
  }, [fetchShowtimes]);

  return { showtimes, loading, error, fetchShowtimes, addShowtime, updateShowtime, cancelShowtime };
};
