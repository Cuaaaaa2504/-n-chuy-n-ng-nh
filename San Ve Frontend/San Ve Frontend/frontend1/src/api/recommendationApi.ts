import axiosClient from './axiosClient';
import { normalizeMovie } from './movieApi';
import type {
  RecommendationParams,
  RecommendationResult,
  RecommendationSource,
} from '../types/recommendation';
import {
  RECOMMENDATION_DEFAULT_LIMIT,
  RECOMMENDATION_MAX_LIMIT,
} from '../types/recommendation';

export class RecommendationError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, { cause });
    this.name = 'RecommendationError';
    this.status = status;
  }
}

function unwrapItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const raw = (payload as Record<string, unknown> | null)?.items;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

function readSource(payload: unknown): RecommendationSource {
  const value = (payload as Record<string, unknown> | null)?.source;
  return value === 'MODEL' ? 'MODEL' : 'FALLBACK';
}

export async function getRecommendations(
  params?: RecommendationParams,
): Promise<RecommendationResult> {
  const limit = Math.min(
    Math.max(Math.trunc(params?.limit ?? RECOMMENDATION_DEFAULT_LIMIT), 1),
    RECOMMENDATION_MAX_LIMIT,
  );

  try {
    const payload = (await axiosClient.get('/recommendations', {
      params: { limit },
    })) as unknown;

    const items = unwrapItems(payload).map(normalizeMovie);
    return {
      items,
      total: items.length,
      source: readSource(payload),
    };
  } catch (err) {
    const error = err as {
      status?: number;
      message?: unknown;
      raw?: { response?: { data?: { message?: unknown } } };
    };
    const backendMessage =
      error?.raw?.response?.data?.message ?? error?.message;
    const message = Array.isArray(backendMessage)
      ? backendMessage.join('; ')
      : backendMessage;

    throw new RecommendationError(
      typeof message === 'string' && message
        ? message
        : 'Không tải được phim gợi ý',
      error?.status,
      err,
    );
  }
}

export default { getRecommendations };
