// src/hooks/useMovies.ts
import { useState, useCallback, useEffect } from 'react';
import type { Movie } from '../types/movie';
import { getMovies, createMovie, updateMovie, deleteMovie } from '../api/movieApi';

export const useMovies = (autoFetch = true) => {
  const [movies,  setMovies]  = useState<Movie[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchMovies = useCallback(async (
    params?: { status?: Movie['status']; page?: number; limit?: number }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMovies(params);
      setMovies(result.items);
      setTotal(result.total);
    } catch {
      setError('Không thể tải danh sách phim. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addMovie = useCallback(async (data: Omit<Movie, 'movie_id'>): Promise<boolean> => {
    try {
      const newMovie = await createMovie(data);
      setMovies(prev => [newMovie, ...prev]);
      setTotal(prev => prev + 1);
      return true;
    } catch {
      setError('Không thể thêm phim. Vui lòng thử lại.');
      return false;
    }
  }, []);

  const editMovie = useCallback(async (
    id: number, data: Partial<Omit<Movie, 'movie_id'>>
  ): Promise<boolean> => {
    try {
      const updated = await updateMovie(id, data);
      setMovies(prev => prev.map(m => m.movie_id === id ? updated : m));
      return true;
    } catch {
      setError('Không thể cập nhật phim. Vui lòng thử lại.');
      return false;
    }
  }, []);

  const removeMovie = useCallback(async (id: number): Promise<boolean> => {
    try {
      await deleteMovie(id);
      setMovies(prev => prev.filter(m => m.movie_id !== id));
      setTotal(prev => prev - 1);
      return true;
    } catch {
      setError('Không thể xóa phim. Vui lòng thử lại.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    let cancelled = false;
    void (async () => {
      try {
        await fetchMovies();
      } catch {
        if (!cancelled) setError('Không thể tải dữ liệu phim.');
      }
    })();
    return () => { cancelled = true; };
  }, [autoFetch, fetchMovies]);

  return { movies, total, loading, error, fetchMovies, addMovie, editMovie, removeMovie };
};
