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

export interface RecommendationResponse {
  items: Movie[];
  total: number;
  source: RecommendationSource;
  debug: RecommendationDebug;
}
