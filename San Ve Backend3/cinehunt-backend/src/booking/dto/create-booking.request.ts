import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsInt,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  holdIds: number[];

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
