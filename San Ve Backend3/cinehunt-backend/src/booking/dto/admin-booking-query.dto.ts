import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminBookingQueryDto {
  @IsOptional()
  @IsString()
  bookingCode?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  movieTitle?: string;

  @IsOptional()
  @IsIn(['PAID', 'PENDING', 'FAILED', 'REFUNDED', ''])
  paymentStatus?: string;

  @IsOptional()
  @IsIn([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PAID',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
    '',
  ])
  status?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateBookingStatusDto {
  @IsIn([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PAID',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
  ])
  status: string;
}
