import { useCallback, useEffect, useState } from 'react';
import {
  cancelShowtime as apiCancelShowtime,
  createShowtime as apiCreateShowtime,
  getAllShowtimes,
  getMovieOptions,
  getRoomOptions,
  updateShowtime as apiUpdateShowtime,
} from '../api/showtimeApi';
import type {
  MovieOption,
  RoomOption,
  Showtime,
  ShowtimeFormData,
  ShowtimeStatus,
} from '../types/showtime';

export type { MovieOption, RoomOption, Showtime, ShowtimeFormData, ShowtimeStatus };

const errMsg = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback;

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShowtimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, movieOpts, roomOpts] = await Promise.all([
        getAllShowtimes(),
        getMovieOptions().catch(() => [] as MovieOption[]),
        getRoomOptions().catch(() => [] as RoomOption[]),
      ]);

      const movieById = new Map(movieOpts.map((m) => [m.id, m.title]));
      const roomById = new Map(roomOpts.map((r) => [r.id, r]));

      setShowtimes(
        list.map((s) => {
          const room = roomById.get(s.roomId);
          return {
            ...s,
            movieTitle: s.movieTitle || movieById.get(s.movieId) || `#${s.movieId}`,
            roomName: s.roomName || room?.name || `#${s.roomId}`,
            cinemaName: s.cinemaName || room?.cinemaName || '—',
            cinemaId: s.cinemaId ?? room?.cinemaId,
          };
        }),
      );
      setMovies(movieOpts);
      setRooms(roomOpts);
    } catch (err) {
      setError(errMsg(err, 'Không thể tải danh sách suất chiếu. Vui lòng thử lại.'));
      setShowtimes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addShowtime = useCallback(
    async (data: ShowtimeFormData): Promise<boolean> => {
      setError(null);
      try {
        await apiCreateShowtime(data);
        await fetchShowtimes(); // đọc lại từ server để chắc chắn khớp DB
        return true;
      } catch (err) {
        setError(errMsg(err, 'Không thể thêm suất chiếu. Vui lòng thử lại.'));
        return false;
      }
    },
    [fetchShowtimes],
  );

  const updateShowtime = useCallback(
    async (
      id: number,
      data: ShowtimeFormData,
      expectedUpdatedAt?: string,
    ): Promise<boolean> => {
      setError(null);
      try {
        await apiUpdateShowtime(id, data, expectedUpdatedAt);
        await fetchShowtimes();
        return true;
      } catch (err) {
        if ((err as { status?: number })?.status === 409) {
          await fetchShowtimes();
        }
        setError(errMsg(err, 'Không thể cập nhật suất chiếu. Vui lòng thử lại.'));
        return false;
      }
    },
    [fetchShowtimes],
  );

  const cancelShowtime = useCallback(
    async (id: number): Promise<boolean> => {
      setError(null);
      try {
        await apiCancelShowtime(id);
        await fetchShowtimes();
        return true;
      } catch (err) {
        setError(errMsg(err, 'Không thể hủy suất chiếu. Vui lòng thử lại.'));
        return false;
      }
    },
    [fetchShowtimes],
  );

  useEffect(() => {
    void (async () => {
      await fetchShowtimes();
    })();
  }, [fetchShowtimes]);

  return {
    showtimes,
    movies,
    rooms,
    loading,
    error,
    fetchShowtimes,
    addShowtime,
    updateShowtime,
    cancelShowtime,
  };
};
