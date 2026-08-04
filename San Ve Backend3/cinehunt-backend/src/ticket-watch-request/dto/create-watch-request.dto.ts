import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWatchRequestDto {
  @IsInt() @Min(1) @Type(() => Number)
  movieId: number;

  @IsOptional()
  @IsInt() @Min(1) @Type(() => Number)
  cinemaId?: number;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString() @MaxLength(8)
  preferredTimeFrom?: string;

  @IsOptional()
  @IsString() @MaxLength(8)
  preferredTimeTo?: string;

  @IsOptional()
  @IsIn(['NORMAL', 'VIP', 'COUPLE'])
  preferredSeatType?: string;

  @IsOptional()
  @IsInt() @Min(1) @Max(8) @Type(() => Number)
  minSeats?: number;

  @IsOptional()
  @IsNumber() @Min(0) @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
