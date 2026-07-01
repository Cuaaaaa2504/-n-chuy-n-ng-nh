import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsIn(['PERCENT', 'FIXED'])
  discountType: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmount?: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;
}
