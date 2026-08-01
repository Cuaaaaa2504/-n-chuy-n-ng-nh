import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MovieRatingService } from './movie-rating.service';

@Controller('movie-ratings')
export class TopMovieRatingController {
  constructor(private readonly movieRatingService: MovieRatingService) {}

  /**
   * Danh sách phim đang chiếu có điểm đánh giá người dùng cao nhất.
   * Khi bằng điểm, phim có nhiều lượt đánh giá hơn được xếp trước.
   */
  @Get('top')
  getTopRated(
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number,
  ) {
    return this.movieRatingService.getTopRated(limit);
  }
}
