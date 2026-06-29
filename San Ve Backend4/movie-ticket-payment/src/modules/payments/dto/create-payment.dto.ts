// src/modules/payments/dto/create-payment.dto.ts
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  bookingId: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;
}