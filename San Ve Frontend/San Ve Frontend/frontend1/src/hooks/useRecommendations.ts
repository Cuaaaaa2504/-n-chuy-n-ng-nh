// component tự quyết định ẩn section đi

import { useCallback, useEffect, useState } from 'react';
import { getRecommendations } from '../api/recommendationApi';
import type { Movie } from '../types/movie';
import type {
  RecommendationDebug,
  RecommendationSource,
} from '../types/recommendation';
import { RECOMMENDATION_DEFAULT_LIMIT } from '../types/recommendation';
import { useAuth } from '../context/AuthContext';

export interface UseRecommendationsOptions {
  limit?: number;
  autoFetch?: boolean;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = RECOMMENDATION_DEFAULT_LIMIT, autoFetch = true } = options;

  const { isLoggedIn, loading: authLoading } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [source, setSource] = useState<RecommendationSource>('FALLBACK');
  const [debug, setDebug] = useState<RecommendationDebug | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!isLoggedIn) {
      setMovies([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations({ limit });
      setMovies(result.items);
      setSource(result.source);
      setDebug(result.debug);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Không tải được phim gợi ý';
      console.warn('[recommendations]', message);
      setError(message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, limit]);

  useEffect(() => {
    if (!autoFetch) return;
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      void fetchRecommendations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFetch, authLoading, fetchRecommendations]);

  return {
    movies,
    source,
    debug,
    loading,
    error,
    isLoggedIn,
    refetch: fetchRecommendations,
  };
}

export default useRecommendations;
