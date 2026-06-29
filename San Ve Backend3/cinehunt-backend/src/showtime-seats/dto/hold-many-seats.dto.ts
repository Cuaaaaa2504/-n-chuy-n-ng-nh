import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class HoldManySeatsDto {
  @ApiProperty({
    example: [101, 102, 103],
    description: 'Danh sách ID ghế theo suất chiếu',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  showtimeSeatIds: number[];

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
