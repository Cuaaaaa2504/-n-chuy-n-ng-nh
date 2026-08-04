import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsInt() @Min(1) @Type(() => Number)
  userId: number;

  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsIn(['BOOKING', 'PAYMENT', 'TICKET', 'TICKET_WATCH', 'PROMOTION', 'SYSTEM'])
  notificationType?: string;

  @IsOptional()
  @IsString() @MaxLength(30)
  referenceType?: string;

  @IsOptional()
  @IsString() @MaxLength(80)
  referenceId?: string;
}
