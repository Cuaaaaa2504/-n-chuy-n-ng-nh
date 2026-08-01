import { Module } from '@nestjs/common';
import { MovieRatingController } from './movie-rating.controller';
import { MovieRatingService } from './movie-rating.service';
import { TopMovieRatingController } from './top-movie-rating.controller';

@Module({
  controllers: [MovieRatingController, TopMovieRatingController],
  providers: [MovieRatingService],
  exports: [MovieRatingService],
})
export class MovieRatingModule {}
