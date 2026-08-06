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
import { Type } from 'class-transformer';

export class HoldSeatDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  showtimeSeatId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(10, { message: 'Thời gian giữ ghế tối đa là 10 phút' })
  holdMinutes?: number = 5;
}

export class HoldSeatsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8, { message: 'Mỗi đơn chỉ được giữ tối đa 8 ghế' })
  @ArrayUnique({ message: 'Danh sách ghế không được trùng lặp' })
  @IsInt({ each: true })
  @Type(() => Number)
  showtimeSeatIds: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(10, { message: 'Thời gian giữ ghế tối đa là 10 phút' })
  holdMinutes?: number = 5;
}

export class HoldResponseDto {
  holdId: string;  // BIGINT — TypeORM trả về string để tránh mất an toàn số học
  holdToken: string;
  expiresAt: Date;
  status: string;
  showtimeSeatId: number;
  seatLabel: string;
  price: number;
  showtimeInfo?: {
    movieTitle: string;
    startTime: Date;
    cinemaName?: string;
  };
}
