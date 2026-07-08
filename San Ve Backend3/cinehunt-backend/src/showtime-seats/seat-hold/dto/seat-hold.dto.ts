import { IsArray, IsInt, IsOptional, Min, ArrayMinSize } from 'class-validator';
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
  holdMinutes?: number = 5;
}

export class HoldSeatsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  showtimeSeatIds: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
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
