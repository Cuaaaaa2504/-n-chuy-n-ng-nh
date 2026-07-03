import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsInt() @Min(1) @Type(() => Number)
  userId: number;

  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  /** Nội dung thông báo (map vào cột `message` NVARCHAR(MAX)) */
  @IsString() @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsIn(['BOOKING', 'PAYMENT', 'TICKET', 'TICKET_WATCH', 'PROMOTION', 'SYSTEM'])
  notificationType?: string;

  /** reference_type – loại entity liên quan (ví dụ: 'booking', 'showtime') */
  @IsOptional()
  @IsString() @MaxLength(30)
  referenceType?: string;

  /** reference_id – ID của entity liên quan (dạng string) */
  @IsOptional()
  @IsString() @MaxLength(80)
  referenceId?: string;
}
