import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { RecommendationService } from './recommendation.service';
import { MovieQueryDto } from './dto/movie-query.dto';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { RecommendationQueryDto } from './dto/recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('movies')
export class MovieController {
  constructor(
    private readonly movieService: MovieService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get()
  findAll(@Query() query: MovieQueryDto) {
    return this.movieService.findAll(query);
  }

  /**
   * ==========================================================================
   * FIX #2 — LỖI NGHIÊM TRỌNG NHẤT CỦA BẢN THIẾT KẾ, VÀ LÀ LỖI IM LẶNG.
   * ==========================================================================
   *
   * Bản thiết kế chỉ ghi "thêm route @Get('recommendations')" mà không nói
   * THÊM VÀO CHỖ NÀO. Nếu thêm xuống cuối class (phản xạ tự nhiên của mọi
   * người), route sẽ nằm SAU `@Get(':id')`.
   *
   * NestJS/Express match route theo THỨ TỰ KHAI BÁO, không theo độ cụ thể.
   * Request `GET /movies/recommendations` sẽ rơi vào `@Get(':id')` với
   * id = "recommendations", `ParseIntPipe` ném luôn:
   *
   *     400 Bad Request
   *     "Validation failed (numeric string is expected)"
   *
   * Handler recommendations không bao giờ được gọi. Debug rất mất thời gian
   * vì code trông hoàn toàn đúng, controller có route, service có method,
   * mà API vẫn 400.
   *
   * => Route TĨNH luôn phải đứng TRƯỚC route ĐỘNG `:id`. Đừng di chuyển
   *    method này xuống dưới.
   */
  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  getRecommendations(
    // FIX #9: `CurrentUser` decorator (auth/decorators/current-user.decorator.ts)
    // trả về payload đã chuẩn hoá { userId, email, role }. Không đọc thẳng
    // `req.user.sub` — JwtStrategy.validate() đã đổi tên `sub` thành `userId`.
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.userId,
      query.limit ?? 10,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateMovieDto) {
    return this.movieService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMovieDto) {
    return this.movieService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.remove(id);
  }
}
