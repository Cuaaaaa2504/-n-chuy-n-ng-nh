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
import { MoviesService } from './movies.service';
import { MovieQueryDto } from './dto/movie-query.dto';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { AdminGuard } from '../common/guards/admin.guard';

/*
Nếu project bạn đã có JwtAuthGuard từ issue #18 thì import đúng file đó.
Ví dụ:
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
Sau đó đổi:
@UseGuards(AdminGuard)
Thành:
@UseGuards(JwtAuthGuard, AdminGuard)
*/

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // GET /movies?search=mai&genre=hanh dong&status=NOW_SHOWING&page=1&limit=10
  @Get()
  findAll(@Query() query: MovieQueryDto) {
    return this.moviesService.findAll(query);
  }

  // GET /movies/1
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.findOne(id);
  }

  // POST /movies
  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateMovieDto) {
    return this.moviesService.create(dto);
  }

  // PATCH /movies/1
  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, dto);
  }

  // DELETE /movies/1
  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.remove(id);
  }
}
