import axiosClient from './axiosClient';
import { normalizeMovie } from './movieApi';
import type {
  RecommendationDebug,
  RecommendationParams,
  RecommendationResult,
  RecommendationSource,
  RecommendationUpstreamSource,
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

/*
 * Đọc khối `debug` do backend trả kèm.
 * Có giá trị mặc định cho mọi trường vì frontend phải chạy được với backend
 * bản cũ (chưa có khối debug). Thiếu thông tin thì badge hiện UNKNOWN, không
 * phải là màn hình trắng.
 */
function readDebug(payload: unknown): RecommendationDebug {
  const raw = (payload as Record<string, unknown> | null)?.debug as
    | Record<string, unknown>
    | undefined;

  const upstream = raw?.upstreamSource;
  const known: RecommendationUpstreamSource[] = [
    'MODEL',
    'CACHE',
    'POPULARITY',
    'UNREACHABLE',
    'UNKNOWN',
  ];

  return {
    upstreamSource: known.includes(upstream as RecommendationUpstreamSource)
      ? (upstream as RecommendationUpstreamSource)
      : 'UNKNOWN',
    serviceReachable: raw?.serviceReachable === true,
    modelVersion:
      typeof raw?.modelVersion === 'string' ? raw.modelVersion : null,
    upstreamCount: Number(raw?.upstreamCount ?? 0) || 0,
    fellBackAfterFilter: raw?.fellBackAfterFilter === true,
    serviceUrl: typeof raw?.serviceUrl === 'string' ? raw.serviceUrl : '',
  };
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
    const result: RecommendationResult = {
      items,
      total: items.length,
      source: readSource(payload),
      debug: readDebug(payload),
    };

    // Log một dòng duy nhất, chỉ ở chế độ dev. Trước đây không có
    // cách nào biết danh sách đang tới từ đâu ngoài việc đọc log backend.
    if (import.meta.env.DEV) {
      console.info(
        `[recommendations] ${result.debug.upstreamSource} — ${items.length} phim` +
          (result.debug.modelVersion ? ` (model ${result.debug.modelVersion})` : ''),
      );
    }

    return result;
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
