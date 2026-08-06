import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
    description: 'Số phút giữ ghế, tối đa 10 phút',
    required: false,
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(10, { message: 'Thời gian giữ ghế tối đa là 10 phút' })
  holdMinutes?: number = 5;
}
