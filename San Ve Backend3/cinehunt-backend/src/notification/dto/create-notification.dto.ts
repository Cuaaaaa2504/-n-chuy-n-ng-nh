import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsInt() @Min(1) @Type(() => Number)
  userId: number;

  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsIn(['BOOKING', 'PAYMENT', 'SYSTEM', 'PROMOTION'])
  type?: string;

  @IsOptional()
  @IsInt() @Min(1) @Type(() => Number)
  refId?: number;
}
