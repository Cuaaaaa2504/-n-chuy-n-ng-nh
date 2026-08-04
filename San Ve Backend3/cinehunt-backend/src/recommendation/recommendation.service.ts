import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';
import { MovieService } from '../movie/movie.service';
import {
  RecommendationDebug,
  RecommendationResponse,
  RecommendationSource,
  RecommendationUpstreamSource,
} from './dto/recommendation.dto';

interface UpstreamResult {
  movieIds: number[];
  source: RecommendationUpstreamSource;
  modelVersion: string | null;
  reachable: boolean;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly movieService: MovieService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('RECOMMENDATION_SERVICE_URL') ??
      'http://localhost:8000'
    ).replace(/\/+$/, '');

    const configuredTimeout = Number.parseInt(
      this.configService.get<string>('RECOMMENDATION_TIMEOUT_MS') ?? '5000',
      10,
    );
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 5000;
  }

  async getRecommendationsForUser(
    userId: number,
    limit = 10,
  ): Promise<RecommendationResponse> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 30);
    const upstream = await this.fetchRecommendationsFromModel(userId, safeLimit);

    const debug: RecommendationDebug = {
      upstreamSource: upstream.source,
      serviceReachable: upstream.reachable,
      modelVersion: upstream.modelVersion,
      upstreamCount: upstream.movieIds.length,
      fellBackAfterFilter: false,
      serviceUrl: this.baseUrl,
    };

    if (upstream.movieIds.length > 0) {
      const items = await this.movieService.findByIds(upstream.movieIds);
      if (items.length > 0) {
        return {
          items,
          total: items.length,
          source: this.toPublicSource(upstream.source),
          debug,
        };
      }

      debug.fellBackAfterFilter = true;
      this.logger.warn(
        `Recommendation service trả ${upstream.movieIds.length} movieId nhưng không phim nào còn hiển thị được (user ${userId}).`,
      );
    }

    const fallbackIds = await this.movieService.findTopBookedMovieIds(safeLimit);
    const items = await this.movieService.findByIds(fallbackIds);
    return { items, total: items.length, source: 'FALLBACK', debug };
  }

  private async fetchRecommendationsFromModel(
    userId: number,
    limit: number,
  ): Promise<UpstreamResult> {
    const url = `${this.baseUrl}/recommend/${userId}`;

    const payload = await firstValueFrom(
      this.httpService.get<unknown>(url, { params: { limit } }).pipe(
        timeout(this.timeoutMs),
        map((response) => response.data),
        catchError((error: Error) => {
          // Trước đây đây là dòng log duy nhất báo service chết, và
          // nó nằm ở mức `warn` lẫn giữa hàng trăm dòng khác. Nay
          // RecommendationScheduler kiểm tra /health lúc boot + định kỳ và log
          // ở mức error kèm hướng dẫn khởi động, nên vấn đề không còn im lặng.
          this.logger.warn(
            `Không gọi được recommendation service (${url}): ${error.message}`,
          );
          return of(null);
        }),
      ),
    );

    if (payload === null) {
      return {
        movieIds: [],
        source: 'UNREACHABLE',
        modelVersion: null,
        reachable: false,
      };
    }

    const record =
      typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;

    return {
      movieIds: this.parseMovieIds(payload).slice(0, limit),
      source: this.parseSource(payload),
      modelVersion:
        typeof record?.modelVersion === 'string' ? record.modelVersion : null,
      reachable: true,
    };
  }

  private parseSource(payload: unknown): RecommendationUpstreamSource {
    if (Array.isArray(payload)) return 'MODEL';
    if (!payload || typeof payload !== 'object') return 'UNKNOWN';

    const source = (payload as Record<string, unknown>).source;
    return source === 'MODEL' || source === 'CACHE' || source === 'POPULARITY'
      ? source
      : 'UNKNOWN';
  }

  private toPublicSource(
    source: RecommendationUpstreamSource,
  ): RecommendationSource {
    return source === 'MODEL' || source === 'CACHE' ? 'MODEL' : 'FALLBACK';
  }

  private parseMovieIds(payload: unknown): number[] {
    if (!payload) return [];

    const record =
      typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;

    const raw: unknown[] = Array.isArray(payload)
      ? payload
      : Array.isArray(record?.movieIds)
        ? (record.movieIds as unknown[])
        : Array.isArray(record?.items)
          ? (record.items as unknown[])
          : [];

    const ids = raw.map((entry) => {
      if (typeof entry === 'number' || typeof entry === 'string') {
        return Number(entry);
      }

      const item =
        entry && typeof entry === 'object'
          ? (entry as Record<string, unknown>)
          : null;
      return Number(
        item?.movieId ?? item?.movie_id ?? item?.MovieID ?? Number.NaN,
      );
    });

    return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  }
}
