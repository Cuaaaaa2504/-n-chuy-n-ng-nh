import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class HoldSeatDto {
  @ApiProperty({
    example: 101,
    description: 'ID ghế theo suất chiếu',
  })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  showtimeSeatId: number;

  @ApiProperty({
    example: 5,
    description: 'Số phút giữ ghế',
    required: false,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  holdMinutes?: number = 5;
}
