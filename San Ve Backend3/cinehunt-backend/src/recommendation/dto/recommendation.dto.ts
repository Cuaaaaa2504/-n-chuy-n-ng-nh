import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Movie } from '../../entities/movie.entity';

export class RecommendationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1)
  @Max(30)
  limit?: number;
}

export type RecommendationSource = 'MODEL' | 'FALLBACK';

/** Nguồn thật sự do service Python báo về, trước khi rút gọn cho public. */
export type RecommendationUpstreamSource =
  | 'MODEL'
  | 'CACHE'
  | 'POPULARITY'
  | 'UNREACHABLE'
  | 'UNKNOWN';

/**
 * FIX REC-06 — badge kỹ thuật phân biệt MODEL / CACHE / FALLBACK.
 *
 * `source` công khai chỉ có hai giá trị MODEL|FALLBACK vì đó là tất cả những gì
 * người dùng cuối cần biết (tiêu đề section đổi theo nó). Nhưng khi debug thì
 * hai giá trị đó gộp mất bốn trường hợp rất khác nhau:
 *
 *   - MODEL      : model thật đang chạy, gợi ý cá nhân hoá thật.
 *   - CACHE      : model chưa nạp, đang đọc bảng movie_recommendations.
 *   - POPULARITY : Python service sống nhưng không có model lẫn cache.
 *   - UNREACHABLE: Python service chết hẳn, NestJS tự xếp theo lượt đặt.
 *
 * Bốn trường hợp này nhìn giống hệt nhau trên giao diện — chính là lý do cả
 * nhóm không phát hiện ra model chưa từng chạy. Khối `debug` này hiện nguyên
 * trạng thái ra, frontend chỉ hiển thị nó ở chế độ dev.
 */
export interface RecommendationDebug {
  upstreamSource: RecommendationUpstreamSource;
  serviceReachable: boolean;
  modelVersion: string | null;
  /** Số movieId service trả về trước khi lọc phim đã gỡ khỏi hệ thống. */
  upstreamCount: number;
  /** true khi service trả dữ liệu nhưng không phim nào còn hiển thị được. */
  fellBackAfterFilter: boolean;
  serviceUrl: string;
}

export interface RecommendationResponse {
  items: Movie[];
  total: number;
  source: RecommendationSource;
  debug: RecommendationDebug;
}
