import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string; // bookingId là UUID (string), không phải number

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
