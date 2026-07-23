import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * FIX [mục 5.1 — lỗ hổng nghiêm trọng ở POST /refunds]
 *
 * Trước đây controller nhận thẳng `@Body() body: Partial<Refund>` — nghĩa là
 * BẤT KỲ user đã đăng nhập nào cũng có thể tự gửi:
 *
 *     POST /refunds
 *     { "bookingId": "<đơn của người khác>",
 *       "paymentId": "...",
 *       "refundAmount": 999999999,
 *       "refundStatus": "SUCCESS",
 *       "completedAt": "..." }
 *
 * ...và tạo ra một bản ghi hoàn tiền ĐÃ THÀNH CÔNG cho đơn hàng của người
 * khác, với số tiền tự chọn. Không có kiểm tra quyền sở hữu, không kiểm tra
 * đơn đã thanh toán chưa, không chặn tạo trùng.
 *
 * DTO này chỉ cho phép client gửi ĐÚNG 2 thứ: đơn nào và lý do gì.
 * Số tiền, paymentId và trạng thái đều do server tự quyết định.
 */
export class CreateRefundDto {
  @ApiProperty({ description: 'booking_id (BIGINT dạng chuỗi) hoặc mã BK-xxxx' })
  @IsString()
  @Matches(/^(\d+|BK-[A-Za-z0-9-]+)$/, {
    message: 'bookingId phải là số nguyên dương hoặc mã đơn dạng BK-xxxx',
  })
  bookingId: string;

  @ApiPropertyOptional({ description: 'Lý do người dùng yêu cầu hoàn tiền' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
