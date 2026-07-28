import type { Movie } from './movie';

export type RecommendationSource = 'MODEL' | 'FALLBACK';

/** Tham số của GET /recommendations. */
export interface RecommendationParams {
  limit?: number;
}

export interface RecommendationResult {
  items: Movie[];
  total: number;
  source: RecommendationSource;
}

export const RECOMMENDATION_MAX_LIMIT = 30;
export const RECOMMENDATION_DEFAULT_LIMIT = 8;
