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

  /** Điểm trung bình công khai của phim. */
  @Get()
  getSummary(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.movieRatingService.getSummary(movieId);
  }

  /** Điểm trung bình kèm số sao người đang đăng nhập đã chọn. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySummary(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movieRatingService.getSummary(movieId, request.user.userId);
  }

  /** Thêm đánh giá hoặc cập nhật đánh giá cũ của chính tài khoản này. */
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

  /** Bỏ đánh giá của chính tài khoản này. */
  @Delete()
  @UseGuards(JwtAuthGuard)
  removeRating(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movieRatingService.removeRating(movieId, request.user.userId);
  }
}
