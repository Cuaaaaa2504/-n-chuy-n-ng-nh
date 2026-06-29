import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie, MovieStatus } from './entities/movie.entity';
import { Genre } from './entities/genre.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieQueryDto } from './dto/movie-query.dto';

@Injectable()
export class MoviesService {
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
      .orderBy('movie.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere('movie.title LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.genre) {
      qb.andWhere('genre.name LIKE :genre', {
        genre: `%${query.genre}%`,
      });
    }

    if (query.status) {
      qb.andWhere('movie.status = :status', {
        status: query.status,
      });
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
      where: { id },
      relations: ['genres'] as any,
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
      durationMinutes: dto.durationMinutes,
      ageRating: dto.ageRating ?? null,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      posterUrl: dto.posterUrl ?? null,
      trailerUrl: dto.trailerUrl ?? null,
      status: dto.status ?? MovieStatus.NOW_SHOWING,
      genres,
    });

    return this.movieRepo.save(movie);
  }

  async update(id: number, dto: UpdateMovieDto) {
    const movie = await this.findOne(id);

    if (dto.title !== undefined) movie.title = dto.title;
    if (dto.description !== undefined) movie.description = dto.description;
    if (dto.durationMinutes !== undefined) movie.durationMinutes = dto.durationMinutes;
    if (dto.ageRating !== undefined) movie.ageRating = dto.ageRating;
    if (dto.releaseDate !== undefined) {
      movie.releaseDate = dto.releaseDate ? new Date(dto.releaseDate) : null;
    }
    if (dto.posterUrl !== undefined) movie.posterUrl = dto.posterUrl;
    if (dto.trailerUrl !== undefined) movie.trailerUrl = dto.trailerUrl;
    if (dto.status !== undefined) movie.status = dto.status;
    if (dto.genreIds !== undefined) {
      movie.genres = await this.resolveGenres(dto.genreIds);
    }

    return this.movieRepo.save(movie);
  }

  async remove(id: number) {
    const movie = await this.findOne(id);

    // SQL không có cột deleted_at. Bảng showtimes có thể tham chiếu movie_id.
    // Vì vậy không hard delete, chỉ chuyển status sang ENDED.
    movie.status = MovieStatus.ENDED;
    await this.movieRepo.save(movie);

    return {
      message: 'Đã xóa phim khỏi danh sách đang hoạt động',
      movieId: id,
      status: MovieStatus.ENDED,
    };
  }

  private async resolveGenres(genreIds?: number[]) {
    if (!genreIds || genreIds.length === 0) {
      return [];
    }

    const uniqueGenreIds = [...new Set(genreIds)];
    const genres = await this.genreRepo.find({
      where: { id: In(uniqueGenreIds) },
    });

    if (genres.length !== uniqueGenreIds.length) {
      throw new BadRequestException('Một hoặc nhiều thể loại không tồn tại');
    }

    return genres;
  }
}
