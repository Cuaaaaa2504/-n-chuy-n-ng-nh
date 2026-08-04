import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsInt,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingProductItemDto {
  @IsInt()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateBookingRequest {
  @ApiProperty({ type: [String], example: ['1001', '1002'] })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    const normalized = value
      .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
      .filter((v) => v.length > 0);
    return [...new Set(normalized)];
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^\d+$/, { each: true, message: 'holdIds phải là số nguyên dương dạng chuỗi' })
  holdIds: string[];

  @ApiPropertyOptional({ description: 'Mã voucher / promotion code' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  promotionId?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingProductItemDto)
  products?: BookingProductItemDto[];
}
