import axiosClient from './axiosClient';

export interface MovieRatingSummary {
  movieId: number;
  averageStars: number;
  averageScore: number;
  ratingCount: number;
  myRating: number | null;
}

type RawSummary = Record<string, unknown>;

const cache = new Map<string, MovieRatingSummary>();
const inflight = new Map<string, Promise<MovieRatingSummary>>();

export function clearMovieRatingCache(): void {
  cache.clear();
  inflight.clear();
}

function normalizeSummary(raw: RawSummary, movieId: number): MovieRatingSummary {
  const averageStars = Number(raw.averageStars ?? raw.average_stars ?? 0);
  const averageScore = Number(raw.averageScore ?? raw.average_score ?? averageStars * 2);
  const ratingCount = Number(raw.ratingCount ?? raw.rating_count ?? 0);
  const rawMyRating = raw.myRating ?? raw.my_rating;

  return {
    movieId: Number(raw.movieId ?? raw.movie_id ?? movieId),
    averageStars: Number.isFinite(averageStars) ? averageStars : 0,
    averageScore: Number.isFinite(averageScore) ? averageScore : 0,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : 0,
    myRating:
      rawMyRating === null || rawMyRating === undefined
        ? null
        : Number(rawMyRating),
  };
}

function apiError(error: unknown, fallback: string): Error {
  const candidate = error as {
    message?: unknown;
    raw?: { response?: { data?: { message?: unknown } } };
  };
  const backendMessage = candidate?.raw?.response?.data?.message ?? candidate?.message;
  const message = Array.isArray(backendMessage)
    ? backendMessage.join('; ')
    : backendMessage;
  return new Error(typeof message === 'string' && message ? message : fallback, {
    cause: error,
  });
}

function updateCaches(summary: MovieRatingSummary) {
  cache.set(`${summary.movieId}:public`, { ...summary, myRating: null });
  cache.set(`${summary.movieId}:me`, summary);
}

export async function getMovieRating(
  movieId: number,
  includeMyRating: boolean,
  force = false,
): Promise<MovieRatingSummary> {
  const key = `${movieId}:${includeMyRating ? 'me' : 'public'}`;

  if (!force) {
    const cached = cache.get(key);
    if (cached) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const request = (async () => {
    try {
      const path = includeMyRating
        ? `/movies/${movieId}/rating/me`
        : `/movies/${movieId}/rating`;
      const raw = (await axiosClient.get(path)) as unknown;
      const summary = normalizeSummary(raw as RawSummary, movieId);
      cache.set(key, summary);
      if (includeMyRating) {
        cache.set(`${movieId}:public`, { ...summary, myRating: null });
      }
      return summary;
    } catch (error) {
      throw apiError(error, 'Không tải được điểm đánh giá của phim');
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

export async function submitMovieRating(
  movieId: number,
  stars: number,
): Promise<MovieRatingSummary> {
  try {
    const raw = (await axiosClient.put(`/movies/${movieId}/rating`, {
      stars,
    })) as unknown;
    const summary = normalizeSummary(raw as RawSummary, movieId);
    updateCaches(summary);
    return summary;
  } catch (error) {
    throw apiError(error, 'Không lưu được đánh giá');
  }
}

export async function deleteMovieRating(
  movieId: number,
): Promise<MovieRatingSummary> {
  try {
    const raw = (await axiosClient.delete(`/movies/${movieId}/rating`)) as unknown;
    const summary = normalizeSummary(raw as RawSummary, movieId);
    updateCaches(summary);
    return summary;
  } catch (error) {
    throw apiError(error, 'Không xóa được đánh giá');
  }
}

export async function getTopRatedMovies(
  limit = 3,
): Promise<MovieRatingSummary[]> {
  try {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);
    const raw = (await axiosClient.get('/movie-ratings/top', {
      params: { limit: safeLimit },
    })) as unknown;

    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown })?.data)
        ? ((raw as { data: unknown[] }).data)
        : [];

    return list.map((item) => {
      const candidate = item as RawSummary;
      return normalizeSummary(
        candidate,
        Number(candidate.movieId ?? candidate.movie_id ?? 0),
      );
    });
  } catch (error) {
    throw apiError(error, 'Không tải được danh sách phim đánh giá cao nhất');
  }
}
