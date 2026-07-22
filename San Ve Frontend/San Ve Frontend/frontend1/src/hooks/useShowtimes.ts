// src/hooks/useShowtimes.ts
//
// FIX BUG-03: hook này trước đây trả về mảng mock hardcode 2 phần tử và mọi
// thao tác thêm/sửa/hủy chỉ đổi state trong bộ nhớ -> refresh là mất sạch.
// Nay toàn bộ CRUD đi qua `showtimeApi` (axiosClient), giống useMovies/useBookings/useUsers.
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

// Re-export để các component cũ (ShowtimeTable / ShowtimeForm) không phải đổi import
export type { MovieOption, RoomOption, Showtime, ShowtimeFormData, ShowtimeStatus };

const errMsg = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback;

export const useShowtimes = () => {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Nạp suất chiếu + danh mục phim/phòng.
   * FIX BUG-04: backend `findAll` chỉ join ['room', 'room.cinema'] nên không có
   * movie.title. Thay vì hardcode MOVIE_ID_MAP, ta lấy danh sách phim thật rồi
   * đối chiếu theo movieId — thêm phim mới cũng luôn hiển thị đúng.
   */
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
    async (id: number, data: ShowtimeFormData): Promise<boolean> => {
      setError(null);
      try {
        await apiUpdateShowtime(id, data);
        await fetchShowtimes();
        return true;
      } catch (err) {
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

  // Wrap trong async IIFE giống useUsers/AdminDashboardPage để không vi phạm
  // rule react-hooks/set-state-in-effect
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
