import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class HoldSeatDto {
  @ApiProperty({
    example: 3,
    description: 'ID người dùng giữ ghế',
  })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    example: 101,
    description: 'ID ghế theo suất chiếu',
  })
  @IsInt()
  @Min(1)
  showtimeSeatId: number;

  @ApiProperty({
    example: 5,
    description: 'Số phút giữ ghế',
  })
  @IsInt()
  @Min(1)
  holdMinutes: number;
}
