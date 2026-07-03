import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  bookingId: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
