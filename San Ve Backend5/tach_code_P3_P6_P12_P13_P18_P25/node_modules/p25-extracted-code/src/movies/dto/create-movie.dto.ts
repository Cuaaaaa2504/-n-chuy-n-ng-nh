import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovieStatus } from '../entities/movie.entity';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  ageRating?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  posterUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  trailerUrl?: string;

  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  genreIds?: number[];
}
