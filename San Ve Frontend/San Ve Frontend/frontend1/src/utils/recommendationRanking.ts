import type { Booking } from '../types/booking';
import type { Movie } from '../types/movie';
import { canonicalGenreKey, normalizeText } from './moviePreferences';

const SUCCESSFUL_BOOKING_STATUSES = new Set([
  'PAID',
  'ISSUED',
  'CONFIRMED',
]);

export interface PersonalizationProfile {
  favoriteGenreKeys: Set<string>;
  historyGenreWeights: Map<string, number>;
  watchedTitleKeys: Set<string>;
  historyGenreLabels: string[];
  hasSignals: boolean;
}

function uniqueMovies(movies: Movie[]) {
  const map = new Map<number, Movie>();
  movies.forEach((movie) => {
    if (!movie.movie_id || movie.status === 'HIDDEN' || movie.status === 'ENDED') return;
    if (!map.has(movie.movie_id)) map.set(movie.movie_id, movie);
  });
  return Array.from(map.values());
}

export function buildPersonalizationProfile(
  allMovies: Movie[],
  bookings: Booking[],
  favoriteGenres: string[],
): PersonalizationProfile {
  const favoriteGenreKeys = new Set(
    favoriteGenres.map(canonicalGenreKey).filter(Boolean),
  );
  const historyGenreWeights = new Map<string, number>();
  const historyGenreLabels = new Map<string, string>();
  const watchedTitleKeys = new Set<string>();

  const moviesByTitle = new Map(
    allMovies.map((movie) => [normalizeText(movie.title), movie]),
  );

  bookings
    .filter((booking) => SUCCESSFUL_BOOKING_STATUSES.has(booking.status))
    .forEach((booking) => {
      const titleKey = normalizeText(booking.movieTitle || '');
      if (!titleKey) return;
      watchedTitleKeys.add(titleKey);

      const matchedMovie = moviesByTitle.get(titleKey);
      matchedMovie?.genres.forEach((genre) => {
        const key = canonicalGenreKey(genre);
        if (!key) return;
        historyGenreWeights.set(key, (historyGenreWeights.get(key) ?? 0) + 1);
        historyGenreLabels.set(key, genre);
      });
    });

  const topHistoryGenres = Array.from(historyGenreWeights.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => historyGenreLabels.get(key) ?? key);

  return {
    favoriteGenreKeys,
    historyGenreWeights,
    watchedTitleKeys,
    historyGenreLabels: topHistoryGenres,
    hasSignals: favoriteGenreKeys.size > 0 || historyGenreWeights.size > 0,
  };
}

export function rankPersonalizedMovies({
  recommendationMovies,
  allMovies,
  bookings,
  favoriteGenres,
  limit,
}: {
  recommendationMovies: Movie[];
  allMovies: Movie[];
  bookings: Booking[];
  favoriteGenres: string[];
  limit: number;
}) {
  const pool = uniqueMovies([...recommendationMovies, ...allMovies]);
  // Dùng toàn bộ catalog để suy ra gu từ vé cũ, kể cả phim đã kết thúc.
  const profile = buildPersonalizationProfile(allMovies, bookings, favoriteGenres);
  const recommendationRank = new Map(
    recommendationMovies.map((movie, index) => [movie.movie_id, index]),
  );

  const scored = pool.map((movie) => {
    let score = 0;
    const upstreamIndex = recommendationRank.get(movie.movie_id);

    if (upstreamIndex !== undefined) {
      score += Math.max(8, 48 - upstreamIndex * 3);
    }

    movie.genres.forEach((genre) => {
      const key = canonicalGenreKey(genre);
      if (profile.favoriteGenreKeys.has(key)) score += 34;
      score += (profile.historyGenreWeights.get(key) ?? 0) * 12;
    });

    if (movie.status === 'NOW_SHOWING') score += 8;
    if (movie.status === 'COMING_SOON') score += 3;

    const rating = Number(movie.imdb_rating ?? movie.average_rating ?? 0);
    if (Number.isFinite(rating)) score += Math.min(rating, 10);

    // Ưu tiên phim mới cùng gu thay vì lặp lại đúng phim đã mua.
    if (profile.watchedTitleKeys.has(normalizeText(movie.title))) score -= 55;

    return { movie, score };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.movie.title.localeCompare(right.movie.title, 'vi');
  });

  return {
    movies: scored.slice(0, limit).map((item) => item.movie),
    profile,
  };
}
