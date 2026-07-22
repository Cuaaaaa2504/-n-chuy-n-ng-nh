// src/hooks/useMovies.ts
import { useState, useCallback, useEffect } from 'react';
import type { Genre, Movie } from '../types/movie';
import {
  getMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  getGenres,
} from '../api/movieApi';

const msgOf = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback;

export interface UseMoviesOptions {
  /** Tự động tải danh sách phim khi mount. Mặc định true. */
  autoFetch?: boolean;
  /**
   * Có tải kèm danh sách thể loại (GET /genres) hay không.
   * Chỉ trang admin cần (để render multi-select trong form phim); các trang
   * public bật lên chỉ tốn thêm request vô ích.
   */
  withGenres?: boolean;
  /** Tham số truyền cho lần fetch đầu tiên. */
  params?: { status?: Movie['status']; page?: number; limit?: number };
}

export const useMovies = (options: UseMoviesOptions = {}) => {
  const { autoFetch = true, withGenres = false, params: initialParams } = options;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(
    async (params?: { status?: Movie['status']; page?: number; limit?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMovies(params);
        setMovies(result.items);
        setTotal(result.total);
      } catch (err) {
        setError(msgOf(err, 'Không thể tải danh sách phim. Vui lòng thử lại.'));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchGenres = useCallback(async () => {
    try {
      setGenres(await getGenres());
    } catch {
      setGenres([]);
    }
  }, []);

  // FIX Lỗi 2 & 3: trước đây catch rỗng nuốt sạch message của backend rồi hiện
  // "Không thể thêm phim. Vui lòng thử lại." — admin không có manh mối gì để sửa.
  // Nay message thật từ ValidationPipe được đẩy ra UI.
  const addMovie = useCallback(
    async (data: Omit<Movie, 'movie_id'>): Promise<boolean> => {
      setError(null);
      try {
        const newMovie = await createMovie(data);
        setMovies((prev) => [newMovie, ...prev]);
        setTotal((prev) => prev + 1);
        return true;
      } catch (err) {
        setError(msgOf(err, 'Không thể thêm phim. Vui lòng thử lại.'));
        return false;
      }
    },
    [],
  );

  const editMovie = useCallback(
    async (id: number, data: Partial<Omit<Movie, 'movie_id'>>): Promise<boolean> => {
      setError(null);
      try {
        const updated = await updateMovie(id, data);
        setMovies((prev) => prev.map((m) => (m.movie_id === id ? updated : m)));
        return true;
      } catch (err) {
        setError(msgOf(err, 'Không thể cập nhật phim. Vui lòng thử lại.'));
        return false;
      }
    },
    [],
  );

  const removeMovie = useCallback(async (id: number): Promise<boolean> => {
    setError(null);
    try {
      await deleteMovie(id);
      setMovies((prev) => prev.filter((m) => m.movie_id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      setError(msgOf(err, 'Không thể xóa phim. Vui lòng thử lại.'));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    void (async () => {
      await fetchMovies(initialParams);
      if (withGenres) await fetchGenres();
    })();
    // initialParams cố tình không nằm trong deps: nó là object literal nên sẽ
    // tạo reference mới mỗi render -> effect chạy vô hạn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, withGenres, fetchMovies, fetchGenres]);

  return {
    movies,
    genres,
    total,
    loading,
    error,
    setError,
    fetchMovies,
    fetchGenres,
    addMovie,
    editMovie,
    removeMovie,
  };
};
