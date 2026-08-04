import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { CreateShowtimeDto } from './create-showtime.dto';

export class UpdateShowtimeDto extends PartialType(CreateShowtimeDto) {
  @ApiPropertyOptional({ description: 'Mốc updatedAt client đã đọc (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
