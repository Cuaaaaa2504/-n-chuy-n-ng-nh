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

/** Chỉ những trạng thái này mới được phép lộ ra trang công khai. */
const PUBLIC_STATUSES: string[] = [
  MovieStatus.NOW_SHOWING,
  MovieStatus.COMING_SOON,
];

/** Booking được coi là "đã thực sự diễn ra" — dùng để đếm độ phổ biến. */
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

  /* ==========================================================================
   * PHẦN THÊM MỚI CHO TÍNH NĂNG GỢI Ý
   * ========================================================================*/

  /**
   * FIX #4 — `findByIds()` như bản thiết kế mô tả sẽ LÀM HỎNG THỨ HẠNG GỢI Ý.
   *
   * Cách viết hiển nhiên là:
   *     return this.movieRepo.find({ where: { movieId: In(movieIds) } });
   *
   * Nhưng `WHERE movie_id IN (...)` KHÔNG đảm bảo thứ tự trả về. SQL Server
   * trả theo thứ tự nó thấy tiện (thường là thứ tự clustered index, tức là
   * movie_id tăng dần). Model xếp hạng phim theo điểm dự đoán — phim hạng 1
   * là phim khớp sở thích nhất. Nếu để nguyên, user luôn thấy danh sách gợi ý
   * sắp theo movie_id, tức là toàn bộ công sức của model bị vứt đi mà giao
   * diện vẫn trông "chạy được". Đây là lỗi không ai phát hiện ra khi test tay.
   *
   * Hàm này sắp lại theo đúng thứ tự `movieIds` đầu vào, đồng thời:
   * - Lọc phim ENDED/HIDDEN (model train trên dữ liệu cũ vẫn có thể gợi ý phim
   *   admin đã gỡ khỏi hệ thống).
   * - Bỏ id không còn tồn tại trong DB thay vì trả về `undefined` trong mảng.
   * - Load kèm relation `genres` để frontend `normalizeMovie()` có đủ dữ liệu.
   */
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

  /**
   * FIX #6 — Fallback cold start. Bản thiết kế ghi:
   *     "trả về top phim theo lượt booking nhiều nhất (ORDER BY booking_count DESC)"
   *
   * Không có cột `booking_count` nào cả. Kiểm tra
   * `CineHunt_Database_V6_3_With_Sample_Data.sql`: bảng `movies` không có cột
   * này, và bảng `booking_orders` KHÔNG có `movie_id`. Booking gắn với
   * `showtime_id`, phải đi qua bảng `showtimes` mới ra được phim:
   *
   *     booking_orders.showtime_id -> showtimes.showtime_id -> showtimes.movie_id
   *
   * Ngoài ra chỉ đếm booking `PAID`/`ISSUED`. Đếm cả `PENDING_PAYMENT` thì một
   * người bấm đặt vé 50 lần rồi bỏ ngang cũng đủ đẩy phim lên top.
   */
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

    // Hệ thống mới toanh, chưa có booking nào -> vẫn phải trả về gì đó thay vì
    // section trống hoác. Lấy phim đang chiếu mới nhất.
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

  /* ========================================================================*/

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
      where: { genreId: In(uniqueIds) },
    });

    if (genres.length !== uniqueIds.length) {
      throw new BadRequestException('Một hoặc nhiều thể loại không tồn tại');
    }

    return genres;
  }
}
