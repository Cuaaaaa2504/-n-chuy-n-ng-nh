import { IsArray, IsNotEmpty, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingRequest {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  holdIds: number[];
}