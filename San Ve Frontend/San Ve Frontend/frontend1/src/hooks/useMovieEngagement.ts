import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ENGAGEMENT_EVENT = 'cmc-movie-engagement-changed';
const FAVORITES_PREFIX = 'cmc:favorite-movies:';
const RATINGS_PREFIX = 'cmc:movie-ratings:';

type RatingMap = Record<string, number>;

type EngagementEventDetail = {
  scope: string;
};

function getUserScope(user: { id?: number; userId?: number; email?: string } | null): string {
  const id = Number(user?.id ?? user?.userId);
  if (Number.isFinite(id) && id > 0) return `user-${id}`;
  if (user?.email) return `email-${user.email.trim().toLocaleLowerCase('vi')}`;
  return 'guest';
}

function readFavoriteIds(scope: string): number[] {
  try {
    const raw = localStorage.getItem(`${FAVORITES_PREFIX}${scope}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map(Number)
          .filter((movieId) => Number.isInteger(movieId) && movieId > 0),
      ),
    );
  } catch {
    return [];
  }
}

function readRatings(scope: string): RatingMap {
  try {
    const raw = localStorage.getItem(`${RATINGS_PREFIX}${scope}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([movieId, stars]) => [movieId, Number(stars)] as const)
        .filter(([, stars]) => Number.isInteger(stars) && stars >= 1 && stars <= 5),
    );
  } catch {
    return {};
  }
}

function emitEngagementChanged(scope: string) {
  window.dispatchEvent(
    new CustomEvent<EngagementEventDetail>(ENGAGEMENT_EVENT, {
      detail: { scope },
    }),
  );
}

export function useMovieEngagement() {
  const { user, isLoggedIn } = useAuth();
  const scope = useMemo(() => getUserScope(user), [user]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => readFavoriteIds(scope));
  const [ratings, setRatings] = useState<RatingMap>(() => readRatings(scope));

  const refresh = useCallback(() => {
    setFavoriteIds(readFavoriteIds(scope));
    setRatings(readRatings(scope));
  }, [scope]);

  useEffect(() => {
    startTransition(() => refresh());

    const onEngagementChanged = (event: Event) => {
      const detail = (event as CustomEvent<EngagementEventDetail>).detail;
      if (!detail?.scope || detail.scope === scope) refresh();
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === `${FAVORITES_PREFIX}${scope}` ||
        event.key === `${RATINGS_PREFIX}${scope}`
      ) {
        refresh();
      }
    };

    window.addEventListener(ENGAGEMENT_EVENT, onEngagementChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ENGAGEMENT_EVENT, onEngagementChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh, scope]);

  const toggleFavorite = useCallback(
    (movieId: number): boolean => {
      if (!isLoggedIn || !Number.isInteger(movieId) || movieId <= 0) return false;

      const current = readFavoriteIds(scope);
      const next = current.includes(movieId)
        ? current.filter((id) => id !== movieId)
        : [...current, movieId];

      localStorage.setItem(`${FAVORITES_PREFIX}${scope}`, JSON.stringify(next));
      setFavoriteIds(next);
      emitEngagementChanged(scope);
      return true;
    },
    [isLoggedIn, scope],
  );

  const rateMovie = useCallback(
    (movieId: number, stars: number): boolean => {
      if (!isLoggedIn || !Number.isInteger(movieId) || movieId <= 0) return false;

      const normalizedStars = Math.min(5, Math.max(1, Math.round(stars)));
      const next = {
        ...readRatings(scope),
        [String(movieId)]: normalizedStars,
      };

      localStorage.setItem(`${RATINGS_PREFIX}${scope}`, JSON.stringify(next));
      setRatings(next);
      emitEngagementChanged(scope);
      return true;
    },
    [isLoggedIn, scope],
  );

  const isFavorite = useCallback(
    (movieId: number) => favoriteIds.includes(movieId),
    [favoriteIds],
  );

  const getRating = useCallback(
    (movieId: number) => ratings[String(movieId)] ?? null,
    [ratings],
  );

  return {
    favoriteIds,
    ratings,
    isLoggedIn,
    isFavorite,
    getRating,
    toggleFavorite,
    rateMovie,
  };
}
