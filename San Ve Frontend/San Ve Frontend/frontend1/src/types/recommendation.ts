// src/types/recommendation.ts
//
// VÁ MỤC #3 CỦA BÁO CÁO — chuẩn request/response cho dữ liệu gợi ý phim.
//
// Shape ở đây phải khớp `RecommendationResponse` trong
// `San Ve Backend3/cinehunt-backend/src/movie/dto/recommendation.dto.ts`.

import type { Movie } from './movie';

/**
 * Nguồn của danh sách gợi ý.
 *
 * Đây KHÔNG phải chi tiết kỹ thuật thừa thãi — nó quyết định tiêu đề section
 * hiển thị cho người dùng:
 *  - MODEL    : model đã cá nhân hoá thật -> "Gợi ý riêng cho bạn"
 *  - FALLBACK : cold start / service gợi ý chết -> "Phim được đặt nhiều nhất"
 *
 * Hứa "gợi ý riêng cho bạn" trong khi thực tế đang trả top phim ăn khách cho
 * mọi người là nói dối người dùng, và cũng khiến chính nhóm phát triển không
 * bao giờ phát hiện ra model chưa từng chạy.
 */
export type RecommendationSource = 'MODEL' | 'FALLBACK';

/** Tham số của `GET /movies/recommendations`. */
export interface RecommendationParams {
  /**
   * Số phim muốn lấy. Backend validate `@Min(1) @Max(30)` — vượt 30 là
   * 400 Bad Request chứ không phải bị cắt bớt âm thầm.
   */
  limit?: number;
}

/** Kết quả đã chuẩn hoá sang `Movie` snake_case mà UI đang dùng. */
export interface RecommendationResult {
  items: Movie[];
  total: number;
  source: RecommendationSource;
}

/** Trần `limit` do backend áp đặt (`@Max(30)` trong RecommendationQueryDto). */
export const RECOMMENDATION_MAX_LIMIT = 30;

/** Số phim mặc định hiển thị ở trang chủ — vừa đúng 2 hàng lưới 4 cột. */
export const RECOMMENDATION_DEFAULT_LIMIT = 8;
