import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie, MovieStatus } from '../entities/movie.entity';
import { Genre } from '../entities/genre.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieQueryDto } from './dto/movie-query.dto';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepo: Repository<Genre>,
  ) {}

  async findAll(query: MovieQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.movieRepo
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .orderBy('movie.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere('movie.title LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.genre) {
      qb.andWhere('genre.genre_name LIKE :genre', {
        genre: `%${query.genre}%`,
      });
    }

    if (query.status) {
      qb.andWhere('movie.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async findOne(id: number) {
    const movie = await this.movieRepo.findOne({
      where: { movie_id: id },
      relations: ['genres'],
    });

    if (!movie) {
      throw new NotFoundException('Không tìm thấy phim');
    }

    return movie;
  }

  async create(dto: CreateMovieDto) {
    const genres = await this.resolveGenres(dto.genreIds);

    const movie = this.movieRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      duration_minutes: dto.durationMinutes,
      age_rating: dto.ageRating ?? null,
      release_date: dto.releaseDate ? new Date(dto.releaseDate) : null,
      poster_url: dto.posterUrl ?? null,
      trailer_url: dto.trailerUrl ?? null,
      status: dto.status ?? MovieStatus.NOW_SHOWING,
      genres,
    });

    return this.movieRepo.save(movie);
  }

  async update(id: number, dto: UpdateMovieDto) {
    const movie = await this.findOne(id);

    if (dto.title !== undefined) movie.title = dto.title;
    if (dto.description !== undefined) movie.description = dto.description;
    if (dto.durationMinutes !== undefined) movie.duration_minutes = dto.durationMinutes;
    if (dto.ageRating !== undefined) movie.age_rating = dto.ageRating;
    if (dto.releaseDate !== undefined) {
      movie.release_date = dto.releaseDate ? new Date(dto.releaseDate) : null;
    }
    if (dto.posterUrl !== undefined) movie.poster_url = dto.posterUrl;
    if (dto.trailerUrl !== undefined) movie.trailer_url = dto.trailerUrl;
    if (dto.status !== undefined) movie.status = dto.status;
    if (dto.genreIds !== undefined) {
      movie.genres = await this.resolveGenres(dto.genreIds);
    }

    return this.movieRepo.save(movie);
  }

  async remove(id: number) {
    const movie = await this.findOne(id);
    movie.status = MovieStatus.ENDED;
    await this.movieRepo.save(movie);

    return {
      message: 'Đã xóa phim khỏi danh sách đang hoạt động',
      movieId: id,
      status: MovieStatus.ENDED,
    };
  }

  private async resolveGenres(genreIds?: number[]) {
    if (!genreIds || genreIds.length === 0) return [];

    const uniqueIds = [...new Set(genreIds)];
    const genres = await this.genreRepo.find({
      where: { genre_id: In(uniqueIds) },
    });

    if (genres.length !== uniqueIds.length) {
      throw new BadRequestException('Một hoặc nhiều thể loại không tồn tại');
    }

    return genres;
  }
}
