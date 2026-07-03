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
  /** movie_id – bắt buộc */
  @IsInt() @Min(1) @Type(() => Number)
  movieId: number;

  /** cinema_id – tuỳ chọn */
  @IsOptional()
  @IsInt() @Min(1) @Type(() => Number)
  cinemaId?: number;

  /** preferred_date (DATE) */
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  /** preferred_time_from (TIME, HH:mm:ss) */
  @IsOptional()
  @IsString() @MaxLength(8)
  preferredTimeFrom?: string;

  /** preferred_time_to (TIME, HH:mm:ss) */
  @IsOptional()
  @IsString() @MaxLength(8)
  preferredTimeTo?: string;

  /** preferred_seat_type – khớp CHECK constraint V5 */
  @IsOptional()
  @IsIn(['NORMAL', 'VIP', 'COUPLE'])
  preferredSeatType?: string;

  /** min_seats – 1..8 */
  @IsOptional()
  @IsInt() @Min(1) @Max(8) @Type(() => Number)
  minSeats?: number;

  /** max_price */
  @IsOptional()
  @IsNumber() @Min(0) @Type(() => Number)
  maxPrice?: number;

  /** expires_at – ngày hết hạn yêu cầu */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
