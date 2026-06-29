import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  bookingId: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
