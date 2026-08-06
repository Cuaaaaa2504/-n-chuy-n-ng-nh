import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class HoldManySeatsDto {
  @ApiProperty({
    example: [101, 102, 103],
    description: 'Danh sách ID ghế theo suất chiếu, tối đa 8 ghế',
    type: [Number],
    maxItems: 8,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8, { message: 'Mỗi đơn chỉ được giữ tối đa 8 ghế' })
  @ArrayUnique({ message: 'Danh sách ghế không được trùng lặp' })
  @Type(() => Number)
  @IsInt({ each: true })
  showtimeSeatIds: number[];

  @ApiProperty({
    example: 10,
    description: 'Số phút giữ ghế, tối đa 10 phút',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(10, { message: 'Thời gian giữ ghế tối đa là 10 phút' })
  holdMinutes?: number = 10;
}
