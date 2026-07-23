import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { CreateShowtimeDto } from './create-showtime.dto';

export class UpdateShowtimeDto extends PartialType(CreateShowtimeDto) {
  /**
   * FIX [mục 6.2]: giá trị `updatedAt` mà client ĐÃ ĐỌC khi mở form.
   *
   * Server so mốc này với giá trị hiện tại trong DB; lệch nhau nghĩa là có
   * người khác đã sửa trong lúc form đang mở -> trả 409 thay vì ghi đè im lặng.
   * Tuỳ chọn để client cũ không gãy — xem `optimistic-lock.util.ts`.
   */
  @ApiPropertyOptional({ description: 'Mốc updatedAt client đã đọc (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
