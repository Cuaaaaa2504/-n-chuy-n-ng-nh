import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsString()
  preferredTimeFrom?: string;

  @IsOptional()
  @IsString()
  preferredTimeTo?: string;

  @IsOptional()
  @IsIn(['STANDARD', 'VIP', 'SWEETBOX'])
  preferredSeatType?: string;

  @IsOptional()
  @IsIn(['ANY', 'FRONT', 'MIDDLE', 'BACK'])
  seatPreference?: string;

  @IsOptional()
  @IsInt() @Min(1) @Type(() => Number)
  ticketQuantity?: number;

  @IsOptional()
  @IsNumber() @Min(0) @Type(() => Number)
  maxBudget?: number;

  @IsOptional()
  @IsBoolean()
  wantsCombo?: boolean;
}
