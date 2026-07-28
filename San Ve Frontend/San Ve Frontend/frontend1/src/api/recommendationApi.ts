// src/api/recommendationApi.ts
//
// VÁ MỤC #3 CỦA BÁO CÁO — "Frontend chưa có API layer cho recommendation".
//
// Endpoint: GET /movies/recommendations?limit=N   (cần Bearer token)
//
// BA CÁI BẪY ĐÃ ĐƯỢC XỬ LÝ Ở ĐÂY, đừng gỡ ra:
//
// 1. KHÔNG unwrap `.data` thêm lần nào.
//    `axiosClient` có interceptor `(response) => response.data` — nó đã bóc
//    một lớp rồi. Viết `res.data.items` (phản xạ quen tay của mọi người dùng
//    axios) sẽ nhận `undefined`, và vì code bọc trong try/catch nên UI chỉ
//    hiện "không có gợi ý" chứ không báo lỗi gì. Xem comment trong
//    `axiosClient.ts`.
//
// 2. ĐƯỜNG DẪN là `/movies/recommendations`, KHÔNG phải `/recommendations`.
//    Backend đặt route trong `MovieController` (@Controller('movies')). Ngoài
//    ra thứ tự khai báo route trong controller đó rất quan trọng — route tĩnh
//    `@Get('recommendations')` phải đứng TRƯỚC `@Get(':id')`, nếu không
//    ParseIntPipe sẽ nuốt request và trả 400. Đừng đổi path bên này mà không
//    kiểm tra bên kia.
//
// 3. `limit` bị `@Max(30)` chặn ở backend, và `ValidationPipe` đang bật
//    `forbidNonWhitelisted: true` -> gửi thêm bất kỳ query param nào khác
//    (page, status, sort...) là 400 "property X should not exist".

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

/** Lỗi kèm mã HTTP để tầng hook phân biệt 401 với lỗi thật. */
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
  // Chỉ chấp nhận đúng hai giá trị backend cam kết. Giá trị lạ -> coi là
  // FALLBACK, vì đó là phía AN TOÀN: tiêu đề section sẽ là "Phim được đặt
  // nhiều nhất" (luôn đúng) thay vì "Gợi ý riêng cho bạn" (có thể sai).
  const value = (payload as Record<string, unknown> | null)?.source;
  return value === 'MODEL' ? 'MODEL' : 'FALLBACK';
}

/**
 * GET /movies/recommendations
 *
 * Yêu cầu người dùng đã đăng nhập: backend lấy `userId` từ JWT
 * (`@CurrentUser()`), frontend KHÔNG truyền userId lên. Truyền userId từ
 * client là lỗ hổng IDOR — ai cũng sửa được số trong URL để xem gợi ý của
 * người khác.
 */
export async function getRecommendations(
  params?: RecommendationParams,
): Promise<RecommendationResult> {
  const limit = Math.min(
    Math.max(Math.trunc(params?.limit ?? RECOMMENDATION_DEFAULT_LIMIT), 1),
    RECOMMENDATION_MAX_LIMIT,
  );

  try {
    const payload = (await axiosClient.get('/movies/recommendations', {
      params: { limit },
    })) as unknown;

    const items = unwrapItems(payload).map(normalizeMovie);

    return {
      items,
      // Tin `items.length` chứ không tin `total` của backend: hai số này lệch
      // nhau nghĩa là có phim bị lọc mất ở đâu đó, và cái người dùng nhìn thấy
      // luôn là `items`.
      total: items.length,
      source: readSource(payload),
    };
  } catch (err) {
    const e = err as {
      status?: number;
      message?: unknown;
      raw?: { response?: { data?: { message?: unknown } } };
    };
    const backendMsg = e?.raw?.response?.data?.message ?? e?.message;
    const msg = Array.isArray(backendMsg) ? backendMsg.join('; ') : backendMsg;

    throw new RecommendationError(
      typeof msg === 'string' && msg ? msg : 'Không tải được phim gợi ý',
      e?.status,
      err,
    );
  }
}

export default { getRecommendations };
