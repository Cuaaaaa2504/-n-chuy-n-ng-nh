import { IsInt, Max, Min } from 'class-validator';

export class RateMovieDto {
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  stars: number;
}
