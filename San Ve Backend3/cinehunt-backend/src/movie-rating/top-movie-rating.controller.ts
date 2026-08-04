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

  @Get('top')
  getTopRated(
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number,
  ) {
    return this.movieRatingService.getTopRated(limit);
  }
}
