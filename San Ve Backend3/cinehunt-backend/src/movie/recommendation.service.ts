// src/movie/recommendation.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';
import { MovieService } from './movie.service';
import { RecommendationResponse } from './dto/recommendation.dto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  /**
   * FIX #7: bản thiết kế gốc hardcode `http://localhost:8001`. Toàn bộ phần
   * còn lại của repo đã bỏ hardcode (xem app.module.ts, config/env.ts) —
   * hardcode ở đây thì lên Docker/staging là chết vì `localhost` trong
   * container NestJS không phải container Python.
   */
  private readonly baseUrl: string;

  /**
   * FIX #14: bản thiết kế gốc không nói gì về timeout. HttpService mặc định
   * KHÔNG có timeout -> Python service treo (đang load lại model, hoặc SQL
   * Server chậm) sẽ giữ request của user tới khi TCP tự đứt. Trang chủ đứng
   * hình. 2 giây là đủ rộng cho một lần inference, quá thì rơi vào fallback.
   */
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly movieService: MovieService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('RECOMMENDATION_SERVICE_URL') ??
      'http://localhost:8001'
    ).replace(/\/+$/, '');

    this.timeoutMs = parseInt(
      this.configService.get<string>('RECOMMENDATION_TIMEOUT_MS') ?? '2000',
      10,
    );
  }

  /**
   * Lấy danh sách phim gợi ý cho user.
   *
   * Nguyên tắc: gợi ý phim là tính năng "có thì tốt". Nó KHÔNG BAO GIỜ được
   * phép làm hỏng trang chủ. Mọi lỗi của Python service đều bị nuốt và thay
   * bằng fallback theo độ phổ biến.
   */
  async getRecommendationsForUser(
    userId: number,
    limit = 10,
  ): Promise<RecommendationResponse> {
    const movieIds = await this.fetchMovieIdsFromModel(userId, limit);

    if (movieIds.length > 0) {
      // FIX #4: findByIds() giữ nguyên thứ tự model trả về và tự lọc phim
      // ENDED/HIDDEN. Xem movie.service.ts để biết vì sao In() là không đủ.
      const items = await this.movieService.findByIds(movieIds);

      if (items.length > 0) {
        return { items, total: items.length, source: 'MODEL' };
      }

      // Model trả về toàn phim đã gỡ khỏi hệ thống -> coi như không có gợi ý.
      this.logger.warn(
        `Model trả ${movieIds.length} movieId nhưng không id nào còn hiển thị được (user ${userId}). Dùng fallback.`,
      );
    }

    // FIX #6: cold start / model chết.
    const fallbackIds = await this.movieService.findTopBookedMovieIds(limit);
    const items = await this.movieService.findByIds(fallbackIds);

    return { items, total: items.length, source: 'FALLBACK' };
  }

  /**
   * Gọi Python FastAPI. Trả về [] nếu có bất kỳ vấn đề gì.
   */
  private async fetchMovieIdsFromModel(
    userId: number,
    limit: number,
  ): Promise<number[]> {
    const url = `${this.baseUrl}/recommend/${userId}`;

    const result = await firstValueFrom(
      this.httpService
        .get<unknown>(url, { params: { limit } })
        .pipe(
          timeout(this.timeoutMs),
          map((response) => response.data),
          catchError((error: Error) => {
            this.logger.warn(
              `Không gọi được recommendation service (${url}): ${error.message}`,
            );
            return of(null);
          }),
        ),
    );

    return this.parseMovieIds(result);
  }

  /**
   * FIX #16: đừng tin mù dữ liệu từ service ngoài.
   *
   * Notebook trả về DataFrame có cột `MovieID` viết hoa; sau khi qua FastAPI
   * nó có thể là `[1, 2, 3]`, `{ movieIds: [...] }` hoặc
   * `{ items: [{ movieId, score }] }` tuỳ người viết `recommendation_api.py`.
   * Hàm này chấp nhận cả ba dạng và ném hết id rác (NaN, âm, 0, trùng) đi —
   * thay vì để `In([NaN])` làm TypeORM sinh SQL lỗi.
   */
  private parseMovieIds(payload: unknown): number[] {
    if (!payload) return [];

    const raw: unknown[] = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as Record<string, unknown>).movieIds)
        ? ((payload as Record<string, unknown>).movieIds as unknown[])
        : Array.isArray((payload as Record<string, unknown>).items)
          ? ((payload as Record<string, unknown>).items as unknown[])
          : [];

    const ids = raw.map((entry) => {
      if (typeof entry === 'number' || typeof entry === 'string') {
        return Number(entry);
      }
      const obj = entry as Record<string, unknown> | null;
      return Number(obj?.movieId ?? obj?.movie_id ?? obj?.MovieID ?? NaN);
    });

    return [
      ...new Set(ids.filter((id) => Number.isInteger(id) && id > 0)),
    ];
  }
}
