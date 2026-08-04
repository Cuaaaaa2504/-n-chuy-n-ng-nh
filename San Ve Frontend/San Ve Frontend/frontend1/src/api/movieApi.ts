import axiosClient from './axiosClient';
import type { Genre, Movie } from '../types/movie';


export function normalizeMovie(item: Record<string, unknown>): Movie {
  const rawGenres = Array.isArray(item.genres) ? (item.genres as unknown[]) : [];
  const genreObjs = rawGenres.map((g) =>
    typeof g === 'string'
      ? { id: 0, name: g }
      : {
          id: Number((g as Record<string, unknown>)?.genreId ?? (g as Record<string, unknown>)?.id ?? 0),
          name: String(
            (g as Record<string, unknown>)?.genreName ??
              (g as Record<string, unknown>)?.name ??
              '',
          ),
        },
  );

  return {
    movie_id: Number(item.movieId ?? item.movie_id ?? item.id ?? 0),
    title: (item.title ?? '') as string,
    duration_minutes: Number(item.durationMinutes ?? item.duration_minutes ?? item.duration ?? 0),
    age_rating: (item.ageRating ?? item.age_rating ?? 'P') as string,
    poster_url: (item.posterUrl ?? item.poster_url ?? '') as string,
    backdrop_url: (item.bannerUrl ?? item.banner_url ?? item.backdrop_url) as string | undefined,
    description: (item.description ?? item.overview) as string | undefined,
    trailer_url: (item.trailerUrl ?? item.trailer_url) as string | undefined,
    status: (item.status ?? 'NOW_SHOWING') as Movie['status'],
    genres: genreObjs.map((g) => g.name).filter(Boolean),
    genre_ids: genreObjs.map((g) => g.id).filter((id) => id > 0),
    release_date: (item.releaseDate ?? item.release_date) as string | null | undefined,
    average_rating: (item.averageRating ?? item.average_rating) as
      | number
      | string
      | null
      | undefined,
    imdb_rating: (item.imdbRating ?? item.imdb_rating) as
      | number
      | string
      | null
      | undefined,
  };
}


type MovieInput = Partial<Omit<Movie, 'movie_id'>>;

function toMoviePayload(data: MovieInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description;
  if (data.duration_minutes !== undefined) {
    payload.durationMinutes = Number(data.duration_minutes);
  }
  if (data.age_rating) payload.ageRating = data.age_rating;
  if (data.status !== undefined) payload.status = data.status;

  if (data.poster_url?.trim()) payload.posterUrl = data.poster_url.trim();
  if (data.trailer_url?.trim()) payload.trailerUrl = data.trailer_url.trim();

  if (data.release_date?.trim()) payload.releaseDate = data.release_date.trim();

  if (data.genre_ids !== undefined) {
    payload.genreIds = data.genre_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  }

  return payload;
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const obj = payload as Record<string, unknown> | null;
  const raw = (obj?.items ?? obj?.data ?? []) as unknown;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

function apiError(err: unknown, fallback: string): Error {
  const e = err as { message?: unknown; raw?: { response?: { data?: { message?: unknown } } } };
  const backendMsg = e?.raw?.response?.data?.message ?? e?.message;
  const msg = Array.isArray(backendMsg) ? backendMsg.join('; ') : backendMsg;
  return new Error(typeof msg === 'string' && msg ? msg : fallback, { cause: err });
}

/* CRUD */

export async function getMovies(params?: {
  status?: Movie['status'];
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Movie[]; total: number }> {
  try {
    const query = {
      page: params?.page ?? 1,
      limit: Math.min(params?.limit ?? 50, 50),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.search ? { search: params.search } : {}),
    };
    const payload = (await axiosClient.get('/movies', { params: query })) as unknown;
    const items = unwrapList(payload).map(normalizeMovie);
    const total = Number((payload as Record<string, unknown>)?.total ?? items.length);
    return { items, total };
  } catch (err) {
    throw apiError(err, 'Không tải được danh sách phim');
  }
}

export async function getMovieById(id: number): Promise<Movie> {
  try {
    const payload = (await axiosClient.get(`/movies/${id}`)) as unknown;
    const item = (payload as Record<string, unknown>)?.data ?? payload;
    return normalizeMovie(item as Record<string, unknown>);
  } catch (err) {
    throw apiError(err, 'Không tải được thông tin phim');
  }
}

export async function createMovie(data: MovieInput): Promise<Movie> {
  try {
    const res = (await axiosClient.post('/movies', toMoviePayload(data))) as unknown;
    const item = (res as Record<string, unknown>)?.data ?? res;
    return normalizeMovie(item as Record<string, unknown>);
  } catch (err) {
    throw apiError(err, 'Không tạo được phim');
  }
}

export async function updateMovie(id: number, data: MovieInput): Promise<Movie> {
  try {
    const res = (await axiosClient.patch(`/movies/${id}`, toMoviePayload(data))) as unknown;
    const item = (res as Record<string, unknown>)?.data ?? res;
    return normalizeMovie(item as Record<string, unknown>);
  } catch (err) {
    throw apiError(err, 'Không cập nhật được phim');
  }
}

export async function deleteMovie(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/movies/${id}`);
  } catch (err) {
    throw apiError(err, 'Không xóa được phim');
  }
}


export async function getGenres(): Promise<Genre[]> {
  try {
    const payload = (await axiosClient.get('/genres')) as unknown;
    const list = unwrapList(payload)
      .map((g) => ({
        id: Number(g.genreId ?? g.genre_id ?? g.id ?? 0),
        name: String(g.genreName ?? g.genre_name ?? g.name ?? ''),
      }))
      .filter((g) => g.id > 0 && g.name);
    if (list.length > 0) return list;
    throw new Error('empty');
  } catch {
    try {
      const { items } = await getMovies({ page: 1, limit: 50 });
      const seen = new Map<number, string>();
      items.forEach((m) =>
        (m.genre_ids ?? []).forEach((id, i) => {
          if (id > 0 && m.genres[i]) seen.set(id, m.genres[i]);
        }),
      );
      return [...seen.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } catch {
      return [];
    }
  }
}
