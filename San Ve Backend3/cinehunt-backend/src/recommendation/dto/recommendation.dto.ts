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

export interface RecommendationResponse {
  items: Movie[];
  total: number;
  source: RecommendationSource;
}
