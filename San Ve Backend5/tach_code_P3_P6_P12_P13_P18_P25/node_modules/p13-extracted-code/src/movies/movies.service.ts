import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMovieDto } from './dto/query-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  async findAll(query: QueryMovieDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.keyword) {
      where.title = Like(`%${query.keyword}%`);
    }

    if (query.genre) {
      where.genre = Like(`%${query.genre}%`);
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.movieRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        releaseDate: 'DESC',
        createdAt: 'DESC',
      },
    });

    return {
      message: 'Lấy danh sách phim thành công',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const movie = await this.movieRepository.findOne({
      where: { id },
    });

    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim');
    }

    return {
      message: 'Lấy chi tiết phim thành công',
      data: movie,
    };
  }

  async create(createMovieDto: CreateMovieDto) {
    const movie = this.movieRepository.create({
      ...createMovieDto,
      releaseDate: new Date(createMovieDto.releaseDate),
    });

    const savedMovie = await this.movieRepository.save(movie);

    return {
      message: 'Thêm phim thành công',
      data: savedMovie,
    };
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
      where: { id },
    });

    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim để cập nhật');
    }

    Object.assign(movie, {
      ...updateMovieDto,
      releaseDate: updateMovieDto.releaseDate
        ? new Date(updateMovieDto.releaseDate)
        : movie.releaseDate,
    });

    const updatedMovie = await this.movieRepository.save(movie);

    return {
      message: 'Cập nhật phim thành công',
      data: updatedMovie,
    };
  }

  async remove(id: number) {
    const movie = await this.movieRepository.findOne({
      where: { id },
    });

    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim để xóa');
    }

    await this.movieRepository.remove(movie);

    return {
      message: 'Xóa phim thành công',
    };
  }
}
