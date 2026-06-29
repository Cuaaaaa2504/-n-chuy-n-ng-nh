import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { MovieStatus } from '../entities/movie.entity';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  genre: string;

  @IsInt()
  @Min(1)
  duration: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ageRating: string;

  @IsUrl()
  @IsOptional()
  posterUrl?: string;

  @IsUrl()
  @IsOptional()
  trailerUrl?: string;

  @IsDateString()
  releaseDate: string;

  @IsEnum(MovieStatus)
  @IsOptional()
  status?: MovieStatus;
}
