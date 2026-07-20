import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @Matches(/^\d+$/, {
    message: 'bookingId phải là số nguyên dương dạng chuỗi',
  })
  bookingId: string;

  @IsString()
  @IsIn(['MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
