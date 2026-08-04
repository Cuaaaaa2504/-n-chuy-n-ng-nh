import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
