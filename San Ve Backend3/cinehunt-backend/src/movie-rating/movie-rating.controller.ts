import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateMovieDto } from './dto/rate-movie.dto';
import { MovieRatingService } from './movie-rating.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: number;
    email: string;
    role: string;
  };
};

@Controller('movies/:movieId/rating')
export class MovieRatingController {
  constructor(private readonly movieRatingService: MovieRatingService) {}

  @Get()
  getSummary(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.movieRatingService.getSummary(movieId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySummary(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movieRatingService.getSummary(movieId, request.user.userId);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  rateMovie(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Body() dto: RateMovieDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movieRatingService.rateMovie(
      movieId,
      request.user.userId,
      dto.stars,
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  removeRating(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movieRatingService.removeRating(movieId, request.user.userId);
  }
}
