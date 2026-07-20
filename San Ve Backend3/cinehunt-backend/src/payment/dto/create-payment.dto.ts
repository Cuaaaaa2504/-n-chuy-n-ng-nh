import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

/**
 * FIX [bookingId must be a UUID]
 *
 * Nguyên nhân gốc: DTO này validate `@IsUUID()`, nhưng cột khoá chính của bảng
 * `booking_orders` là `booking_id BIGINT IDENTITY` (xem BookingOrder entity) —
 * hệ thống KHÔNG hề dùng UUID ở bất kỳ đâu. Vì vậy mọi request thanh toán hợp lệ
 * đều bị ValidationPipe chặn với message "bookingId must be a UUID".
 *
 * Ngoài ra frontend có lúc gửi `bookingCode` (dạng BK-<timestamp>-<suffix>) thay
 * cho `bookingId`. Ta chấp nhận cả hai dạng ở tầng DTO và để BookingService phân
 * giải về booking thật (xem BookingService.buildBookingRef).
 */
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
  // Nhận cả number (JSON number) lẫn string, chuẩn hoá về string đã trim.
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value).trim(),
  )
  @IsString({ message: 'bookingId phải là chuỗi' })
  @Matches(BOOKING_REF_PATTERN, {
    message:
      'bookingId phải là ID số của đơn đặt vé hoặc mã đơn dạng BK-xxxxx',
  })
  bookingId: string;

  // FIX kèm theo: DB có CHECK constraint trên payment_method
  // ('MOMO','VNPAY','BANKING','CASH','MOCK'). Trước đây chỉ @IsString() nên giá
  // trị sai lọt xuống DB và vỡ ở tầng driver (500) thay vì 400 rõ ràng.
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
