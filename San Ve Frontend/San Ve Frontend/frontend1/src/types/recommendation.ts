import type { Movie } from './movie';

export type RecommendationSource = 'MODEL' | 'FALLBACK';

/*
 * Nguồn dữ liệu THẬT do backend báo về.
 * `source` công khai chỉ có MODEL|FALLBACK vì đó là tất cả những gì người dùng
 * cần (tiêu đề section đổi theo nó). Nhưng hai giá trị đó gộp mất bốn tình
 * huống rất khác nhau, và vì chúng trông y hệt nhau trên giao diện nên cả nhóm
 * không phát hiện ra model chưa từng chạy:
 *   MODEL       model thật đang chạy, gợi ý cá nhân hoá thật
 *   CACHE       model chưa nạp, đang đọc bảng movie_recommendations
 *   POPULARITY  service Python sống nhưng không có cả model lẫn cache
 *   UNREACHABLE service Python chết hẳn, NestJS tự xếp theo lượt đặt
 */
export type RecommendationUpstreamSource =
  | 'MODEL'
  | 'CACHE'
  | 'POPULARITY'
  | 'UNREACHABLE'
  | 'UNKNOWN';

export interface RecommendationDebug {
  upstreamSource: RecommendationUpstreamSource;
  serviceReachable: boolean;
  modelVersion: string | null;
  upstreamCount: number;
  fellBackAfterFilter: boolean;
  serviceUrl: string;
}

/** Tham số của GET /recommendations. */
export interface RecommendationParams {
  limit?: number;
}

export interface RecommendationResult {
  items: Movie[];
  total: number;
  source: RecommendationSource;
  debug: RecommendationDebug;
}

export const RECOMMENDATION_MAX_LIMIT = 30;
export const RECOMMENDATION_DEFAULT_LIMIT = 8;

/** Nhãn + màu cho badge dev. Giữ cạnh type để thêm nguồn mới không sót chỗ nào. */
export const UPSTREAM_LABELS: Record<
  RecommendationUpstreamSource,
  { label: string; hint: string }
> = {
  MODEL: {
    label: 'MODEL',
    hint: 'Model hybrid đang chạy — gợi ý cá nhân hoá thật.',
  },
  CACHE: {
    label: 'CACHE',
    hint: 'Đọc từ bảng movie_recommendations. Service Python chưa nạp được file model — chạy `python train.py`.',
  },
  POPULARITY: {
    label: 'POPULARITY',
    hint: 'Service Python đang chạy nhưng không có model lẫn cache. Mọi tài khoản nhận cùng danh sách.',
  },
  UNREACHABLE: {
    label: 'SERVICE OFF',
    hint: 'Không gọi được recommendation-service. Khởi động: uvicorn app.main:app --port 8000',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    hint: 'Service trả về định dạng không nhận diện được.',
  },
};
