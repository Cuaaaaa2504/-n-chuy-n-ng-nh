import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateShowtimeDto {
  @ApiProperty()
  @IsInt()
  movieId!: number;

  @ApiProperty()
  @IsInt()
  roomId!: number;

  @ApiProperty()
  @IsDateString()
  startTime!: string;

  @ApiProperty()
  @IsDateString()
  endTime!: string;

  @ApiProperty()
  @IsNumber()
  basePrice!: number;

  @ApiPropertyOptional({ default: 'OPEN' })
  @IsOptional()
  @IsString()
  status?: string;
}
