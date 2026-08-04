import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export const BOOKING_REF_PATTERN = /^(?:\d{1,19}|BK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/;

export const PAYMENT_METHODS = [
  'MOMO',
  'VNPAY',
  'BANKING',
  'CASH',
  'MOCK',
] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number];

export class CreatePaymentDto {
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value).trim(),
  )
  @IsString({ message: 'bookingId phải là chuỗi' })
  @Matches(BOOKING_REF_PATTERN, {
    message:
      'bookingId phải là ID số của đơn đặt vé hoặc mã đơn dạng BK-xxxxx',
  })
  bookingId: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(PAYMENT_METHODS, {
    message: `paymentMethod phải là một trong: ${PAYMENT_METHODS.join(', ')}`,
  })
  paymentMethod: PaymentMethodCode;

  @IsOptional()
  @IsString()
  provider?: string;
}
