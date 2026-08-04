import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie, MovieStatus } from '../entities/movie.entity';
import { Genre } from '../entities/genre.entity';
import { BookingOrder } from '../entities/booking-order.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieQueryDto } from './dto/movie-query.dto';

const PUBLIC_STATUSES: string[] = [
  MovieStatus.NOW_SHOWING,
  MovieStatus.COMING_SOON,
];

const SUCCESSFUL_BOOKING_STATUSES = ['PAID', 'ISSUED'];

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
      .orderBy('movie.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere('movie.title LIKE :search', { search: `%${query.search}%` });
    }

    if (query.genre) {
      qb.andWhere('genre.genreName LIKE :genre', { genre: `%${query.genre}%` });
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
      where: { movieId: id },
      relations: ['genres'],
    });

    if (!movie) throw new NotFoundException('Không tìm thấy phim');

    return movie;
  }

  /* PHẦN THÊM MỚI CHO TÍNH NĂNG GỢI Ý */

  async findByIds(movieIds: number[]): Promise<Movie[]> {
    if (!movieIds || movieIds.length === 0) return [];

    const uniqueIds = [...new Set(movieIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (uniqueIds.length === 0) return [];

    const movies = await this.movieRepo.find({
      where: { movieId: In(uniqueIds), status: In(PUBLIC_STATUSES) },
      relations: ['genres'],
    });

    const byId = new Map(movies.map((movie) => [movie.movieId, movie]));

    return uniqueIds
      .map((id) => byId.get(id))
      .filter((movie): movie is Movie => movie !== undefined);
  }

  async findTopBookedMovieIds(limit = 10): Promise<number[]> {
    const rows = await this.movieRepo
      .createQueryBuilder('movie')
      .select('movie.movieId', 'movieId')
      .addSelect('COUNT(bo.booking_id)', 'bookingCount')
      .innerJoin('movie.showtimes', 'st')
      .innerJoin(
        BookingOrder,
        'bo',
        'bo.showtime_id = st.showtime_id AND bo.status IN (:...bookingStatuses)',
        { bookingStatuses: SUCCESSFUL_BOOKING_STATUSES },
      )
      .where('movie.status IN (:...publicStatuses)', {
        publicStatuses: PUBLIC_STATUSES,
      })
      .groupBy('movie.movieId')
      .orderBy('COUNT(bo.booking_id)', 'DESC')
      .limit(limit)
      .getRawMany<{ movieId: number; bookingCount: number }>();

    const ids = rows.map((row) => Number(row.movieId)).filter((id) => id > 0);

    if (ids.length === 0) {
      const newest = await this.movieRepo.find({
        where: { status: MovieStatus.NOW_SHOWING },
        order: { createdAt: 'DESC' },
        take: limit,
      });
      return newest.map((movie) => movie.movieId);
    }

    return ids;
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
    if (dto.durationMinutes !== undefined)
      movie.durationMinutes = dto.durationMinutes;
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

  movie.status = MovieStatus.HIDDEN;
  await this.movieRepo.save(movie);

  return {
    message: 'Đã ẩn phim khỏi hệ thống',
    movieId: id,
    status: MovieStatus.HIDDEN,
  };
}

  private async resolveGenres(genreIds?: number[]) {
    if (!genreIds || genreIds.length === 0) return [];

    const uniqueIds = [...new Set(genreIds)];
    const genres = await this.genreRepo.find({
      where: { genreId: In(uniqueIds) },
    });

    if (genres.length !== uniqueIds.length) {
      throw new BadRequestException('Một hoặc nhiều thể loại không tồn tại');
    }

    return genres;
  }
}
