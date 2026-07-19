import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class RevenueQueryDto {
  /** Nhóm doanh thu theo ngày / tháng / phim / rạp */
  @IsOptional()
  @IsIn(['day', 'month', 'movie', 'cinema'])
  groupBy?: 'day' | 'month' | 'movie' | 'cinema' = 'day';

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
