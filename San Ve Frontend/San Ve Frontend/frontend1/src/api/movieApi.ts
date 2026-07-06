// src/api/movieApi.ts
import axiosClient from './axiosClient';
import type { Movie } from '../types/movie';

function normalizeMovie(item: Record<string, unknown>): Movie {
  return {
    movie_id:         Number(item.movie_id  ?? item.movieId  ?? item.id ?? 0),
    title:            (item.title           ?? '')           as string,
    duration_minutes: Number(item.duration_minutes ?? item.duration ?? 0),
    age_rating:       (item.age_rating      ?? item.ageRating ?? 'P') as string,
    poster_url:       (item.poster_url      ?? item.posterUrl ?? '') as string,
    backdrop_url:     (item.backdrop_url    ?? item.backdropUrl) as string | undefined,
    description:      (item.description    ?? item.overview)  as string | undefined,
    trailer_url:      (item.trailer_url    ?? item.trailerUrl) as string | undefined,
    status:           (item.status         ?? 'NOW_SHOWING') as Movie['status'],
    genres:           (Array.isArray(item.genres) ? item.genres : []) as string[],
    featured:         Boolean(item.featured ?? false),
  };
}

/** Lấy danh sách phim — có thể lọc theo status */
export async function getMovies(params?: {
  status?: Movie['status'];
  page?: number;
  limit?: number;
}): Promise<{ items: Movie[]; total: number }> {
  const payload = await axiosClient.get('/movies', { params }) as unknown;
  const raw = Array.isArray(payload)
    ? payload
    : ((payload as Record<string, unknown>).data as unknown[]
       ?? (payload as Record<string, unknown>).items as unknown[]
       ?? []);
  const items = (raw as Record<string, unknown>[]).map(normalizeMovie);
  const total = ((payload as Record<string, unknown>).total as number) ?? items.length;
  return { items, total };
}

/** Lấy chi tiết một phim */
export async function getMovieById(id: number): Promise<Movie> {
  const payload = await axiosClient.get(`/movies/${id}`) as unknown;
  const item = (payload as Record<string, unknown>).data ?? payload;
  return normalizeMovie(item as Record<string, unknown>);
}

/** Thêm phim mới (admin) */
export async function createMovie(data: Omit<Movie, 'movie_id'>): Promise<Movie> {
  const res = await axiosClient.post('/movies', data) as unknown;
  const item = (res as Record<string, unknown>).data ?? res;
  return normalizeMovie(item as Record<string, unknown>);
}

/** Cập nhật phim (admin) */
export async function updateMovie(id: number, data: Partial<Omit<Movie, 'movie_id'>>): Promise<Movie> {
  const res = await axiosClient.put(`/movies/${id}`, data) as unknown;
  const item = (res as Record<string, unknown>).data ?? res;
  return normalizeMovie(item as Record<string, unknown>);
}

/** Xóa phim (admin) */
export async function deleteMovie(id: number): Promise<void> {
  await axiosClient.delete(`/movies/${id}`);
}
