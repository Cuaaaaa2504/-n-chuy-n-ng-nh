// src/movie/dto/recommendation.dto.ts
//
// FIX #3: `main.ts` bật ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }).
// Nghĩa là MỌI query param không được khai báo trong một DTO đều làm request
// fail 400 "property limit should not exist". Bản thiết kế gốc gọi
// `GET /movies/recommendations?limit=10` mà không có DTO nào -> hỏng ngay
// request đầu tiên. DTO dưới đây khai báo hợp lệ `limit`.

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecommendationQueryDto {
  /**
   * Số phim muốn gợi ý. Mặc định 10, chặn trần 30 để một request không kéo
   * cả bảng movies (đồng bộ với @Max(50) của MovieQueryDto).
   */
  @IsOptional()
  @Type(() => Number) // query param luôn là string -> phải ép kiểu trước @IsInt
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1)
  @Max(30)
  limit?: number;
}

/**
 * FIX #10: bản thiết kế gốc định nghĩa `RecommendedMovieDto` với các field
 * `movieId | title | posterUrl | score`. Nhưng frontend không dùng shape đó:
 * `movieApi.normalizeMovie()` kỳ vọng object phim ĐẦY ĐỦ theo camelCase của
 * entity `Movie` (movieId, durationMinutes, ageRating, posterUrl, genres[],
 * status...) rồi tự chuyển sang snake_case cho `types/movie.ts`.
 *
 * Nếu backend chỉ trả 4 field, `MovieCard` sẽ mất thời lượng, nhãn tuổi, thể
 * loại và không lọc được phim ENDED/HIDDEN. Vì vậy endpoint trả nguyên entity
 * `Movie` (kèm relation genres) và bổ sung metadata gợi ý ở ngoài.
 */
export interface RecommendationResponse {
  /** Danh sách phim đầy đủ, ĐÃ sắp theo đúng thứ hạng model trả về. */
  items: unknown[];

  /** Số phim thực trả về (sau khi lọc phim đã ẩn/kết thúc). */
  total: number;

  /**
   * Nguồn của kết quả — hữu ích để debug và để frontend đổi tiêu đề section:
   *  - 'MODEL'    : Python service trả về bình thường
   *  - 'FALLBACK' : cold start / Python service chết -> top phim được đặt nhiều
   */
  source: 'MODEL' | 'FALLBACK';
}
