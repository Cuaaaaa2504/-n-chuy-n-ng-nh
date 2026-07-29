/**
 * FIX CHAT-05 — Nguồn dữ liệu thật cho chatbot.
 *
 * Trước đây payload gửi Gemini chỉ có system prompt + lịch sử chat, nên mọi câu
 * hỏi kiểu "phim nào đang chiếu tối nay?" hay "còn ghế A5 không?" đều bị model
 * bịa hoặc từ chối. File này cung cấp các hàm truy vấn CineHuntDB để
 * `chat.service.ts` gọi qua cơ chế function calling của Gemini.
 *
 * NGUYÊN TẮC BẢO MẬT (quan trọng, đọc trước khi thêm hàm mới):
 *   1. CHỈ ĐỌC. Không có hàm nào ghi/sửa/xoá. Model không được phép đặt vé hộ.
 *   2. CHỈ DỮ LIỆU CÔNG KHAI. Không đụng tới bảng users, booking_orders,
 *      payments, refresh_tokens... Người dùng có thể lừa model in ra dữ liệu
 *      cá nhân của người khác, nên đơn giản là không đưa dữ liệu đó vào tầm với.
 *   3. Mọi tham số từ model đều là INPUT KHÔNG TIN CẬY -> luôn đi qua
 *      parameter binding của TypeORM, không nối chuỗi SQL, luôn kẹp `limit`.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieStatus } from '../entities/movie.entity';
import { Showtime } from '../entities/showtime.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { Cinema } from '../entities/cinema.entity';

/** Trạng thái phim được phép lộ ra ngoài. Giống PUBLIC_STATUSES của MovieService. */
const PUBLIC_MOVIE_STATUSES = [MovieStatus.NOW_SHOWING, MovieStatus.COMING_SOON];

/** Trần cứng cho mọi tham số `limit` do model truyền vào. */
const MAX_LIMIT = 20;

function clampLimit(value: unknown, fallback = 8): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT);
}

/** Cột DECIMAL của mssql trả về dạng string -> ép về number trước khi gửi model. */
function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatVnd(value: unknown): string {
  return `${toNumber(value).toLocaleString('vi-VN')} đ`;
}

/**
 * Chuẩn hoá chuỗi ngày do model truyền vào.
 *
 * Model hay trả về "hôm nay", "tối nay", "2026-07-29" hoặc "29/07/2026". Nếu
 * không parse được thì trả null và hàm gọi tự hiểu là "không lọc theo ngày" —
 * thà trả nhiều suất chiếu còn hơn trả rỗng rồi model kết luận "hết suất".
 */
function parseDateHint(raw: unknown): Date | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (['hôm nay', 'hom nay', 'today', 'tối nay', 'toi nay'].includes(text)) {
    return startOfToday;
  }
  if (['ngày mai', 'ngay mai', 'tomorrow', 'mai'].includes(text)) {
    return new Date(startOfToday.getTime() + 86_400_000);
  }

  // dd/mm/yyyy
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  // yyyy-mm-dd
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  return null;
}

export interface SeatAvailability {
  showtimeId: number;
  movieTitle: string;
  startTime: string;
  cinema: string;
  room: string;
  totalSeats: number;
  availableSeats: number;
  soldOut: boolean;
  requestedSeats?: Array<{ label: string; status: string; price?: string }>;
  sampleAvailableLabels: string[];
}

@Injectable()
export class ChatDataService {
  private readonly logger = new Logger(ChatDataService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepo: Repository<ShowtimeSeat>,
    @InjectRepository(ConcessionCombo)
    private readonly comboRepo: Repository<ConcessionCombo>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
  ) {}

  // =====================================================================
  // 1. TÌM PHIM
  // =====================================================================
  async searchMovies(args: {
    query?: string;
    status?: string;
    genre?: string;
    limit?: number;
  }) {
    const limit = clampLimit(args?.limit, 8);

    const qb = this.movieRepo
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .where('movie.status IN (:...statuses)', {
        statuses: PUBLIC_MOVIE_STATUSES,
      })
      .orderBy('movie.averageRating', 'DESC')
      .addOrderBy('movie.releaseDate', 'DESC')
      .take(limit);

    if (args?.query) {
      qb.andWhere(
        '(movie.title LIKE :q OR movie.originalTitle LIKE :q OR movie.director LIKE :q OR movie.actors LIKE :q)',
        { q: `%${String(args.query).trim()}%` },
      );
    }

    if (args?.status) {
      const status = String(args.status).trim().toUpperCase();
      if (PUBLIC_MOVIE_STATUSES.includes(status as MovieStatus)) {
        qb.andWhere('movie.status = :status', { status });
      }
    }

    // Lọc theo thể loại phải làm bằng subquery: nếu andWhere thẳng trên
    // `genre.genreName` thì leftJoinAndSelect chỉ nạp ĐÚNG thể loại khớp,
    // và model sẽ tưởng phim chỉ có một thể loại duy nhất.
    if (args?.genre) {
      qb.andWhere(
        `movie.movie_id IN (
           SELECT mg.movie_id FROM movie_genres mg
           INNER JOIN genres g ON g.genre_id = mg.genre_id
           WHERE g.genre_name LIKE :genreName
         )`,
        { genreName: `%${String(args.genre).trim()}%` },
      );
    }

    const movies = await qb.getMany();

    return {
      count: movies.length,
      movies: movies.map((m) => ({
        movieId: m.movieId,
        title: m.title,
        status: m.status,
        durationMinutes: m.durationMinutes,
        ageRating: m.ageRating,
        genres: (m.genres ?? []).map((g) => g.genreName),
        averageRating: toNumber(m.averageRating),
        releaseDate: m.releaseDate
          ? new Date(m.releaseDate).toISOString().slice(0, 10)
          : null,
        director: m.director,
        country: m.country,
      })),
    };
  }

  // =====================================================================
  // 2. CHI TIẾT MỘT PHIM
  // =====================================================================
  async getMovieDetail(args: { movieId?: number; title?: string }) {
    const qb = this.movieRepo
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .where('movie.status IN (:...statuses)', {
        statuses: PUBLIC_MOVIE_STATUSES,
      });

    if (args?.movieId && Number.isInteger(Number(args.movieId))) {
      qb.andWhere('movie.movieId = :id', { id: Number(args.movieId) });
    } else if (args?.title) {
      qb.andWhere('movie.title LIKE :t', { t: `%${String(args.title).trim()}%` });
    } else {
      return { found: false, reason: 'Cần movieId hoặc title.' };
    }

    const movie = await qb.getOne();
    if (!movie) {
      return { found: false, reason: 'Không tìm thấy phim đang hiển thị nào khớp.' };
    }

    return {
      found: true,
      movie: {
        movieId: movie.movieId,
        title: movie.title,
        originalTitle: movie.originalTitle,
        description: movie.description,
        durationMinutes: movie.durationMinutes,
        ageRating: movie.ageRating,
        director: movie.director,
        actors: movie.actors,
        country: movie.country,
        language: movie.language,
        status: movie.status,
        averageRating: toNumber(movie.averageRating),
        genres: (movie.genres ?? []).map((g) => g.genreName),
        releaseDate: movie.releaseDate
          ? new Date(movie.releaseDate).toISOString().slice(0, 10)
          : null,
      },
    };
  }

  // =====================================================================
  // 3. LỊCH CHIẾU
  // =====================================================================
  async getShowtimes(args: {
    movieId?: number;
    movieTitle?: string;
    date?: string;
    cinemaName?: string;
    city?: string;
    limit?: number;
  }) {
    const limit = clampLimit(args?.limit, 12);

    const qb = this.showtimeRepo
      .createQueryBuilder('st')
      .innerJoin('st.movie', 'movie')
      .innerJoin('st.room', 'room')
      .innerJoin('room.cinema', 'cinema')
      .select([
        'st.showtimeId',
        'st.startTime',
        'st.endTime',
        'st.basePrice',
        'st.status',
        'movie.movieId',
        'movie.title',
        'movie.durationMinutes',
        'room.roomId',
        'room.roomName',
        'room.roomType',
        'cinema.cinemaId',
        'cinema.cinemaName',
        'cinema.address',
        'cinema.city',
      ])
      .where('st.status = :open', { open: 'OPEN' })
      // Không bao giờ trả suất đã chiếu xong: model không có khái niệm "bây
      // giờ là mấy giờ" nếu ta không lọc hộ, và sẽ mời người dùng đặt vé cho
      // suất 9h sáng lúc 10h tối.
      .andWhere('st.startTime >= :now', { now: new Date() })
      .orderBy('st.startTime', 'ASC')
      .take(limit);

    if (args?.movieId && Number.isInteger(Number(args.movieId))) {
      qb.andWhere('movie.movieId = :mid', { mid: Number(args.movieId) });
    }
    if (args?.movieTitle) {
      qb.andWhere('movie.title LIKE :mt', {
        mt: `%${String(args.movieTitle).trim()}%`,
      });
    }
    if (args?.cinemaName) {
      qb.andWhere('cinema.cinemaName LIKE :cn', {
        cn: `%${String(args.cinemaName).trim()}%`,
      });
    }
    if (args?.city) {
      qb.andWhere('cinema.city LIKE :city', {
        city: `%${String(args.city).trim()}%`,
      });
    }

    const day = parseDateHint(args?.date);
    if (day) {
      const next = new Date(day.getTime() + 86_400_000);
      qb.andWhere('st.startTime >= :dayStart AND st.startTime < :dayEnd', {
        dayStart: day,
        dayEnd: next,
      });
    }

    const rows = await qb.getMany();

    return {
      count: rows.length,
      note:
        rows.length === 0
          ? 'Không có suất chiếu nào khớp điều kiện trong hệ thống. Không được bịa suất chiếu.'
          : undefined,
      showtimes: rows.map((st) => ({
        showtimeId: st.showtimeId,
        movieId: st.movie?.movieId,
        movieTitle: st.movie?.title,
        startTime: this.formatDateTime(st.startTime),
        endTime: this.formatDateTime(st.endTime),
        basePrice: formatVnd(st.basePrice),
        cinema: st.room?.cinema?.cinemaName,
        city: st.room?.cinema?.city,
        address: st.room?.cinema?.address,
        room: st.room?.roomName,
        roomType: st.room?.roomType,
      })),
    };
  }

  // =====================================================================
  // 4. TÌNH TRẠNG GHẾ
  // =====================================================================
  async checkSeatAvailability(args: {
    showtimeId?: number;
    seatLabels?: string[] | string;
  }): Promise<SeatAvailability | { found: false; reason: string }> {
    const showtimeId = Number(args?.showtimeId);
    if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
      return { found: false, reason: 'Cần showtimeId hợp lệ (lấy từ get_showtimes).' };
    }

    const showtime = await this.showtimeRepo
      .createQueryBuilder('st')
      .innerJoin('st.movie', 'movie')
      .innerJoin('st.room', 'room')
      .innerJoin('room.cinema', 'cinema')
      .select([
        'st.showtimeId',
        'st.startTime',
        'movie.title',
        'room.roomId',
        'room.roomName',
        'cinema.cinemaId',
        'cinema.cinemaName',
      ])
      .where('st.showtimeId = :id', { id: showtimeId })
      .getOne();

    if (!showtime) {
      return { found: false, reason: 'Không tìm thấy suất chiếu này.' };
    }

    const seats = await this.showtimeSeatRepo
      .createQueryBuilder('ss')
      .innerJoin('ss.seat', 'seat')
      .select([
        'ss.showtimeSeatId',
        'ss.status',
        'ss.price',
        'ss.holdExpiresAt',
        'seat.seatId',
        'seat.seatLabel',
      ])
      .where('ss.showtimeId = :id', { id: showtimeId })
      .getMany();

    const now = Date.now();

    // Ghế HELD mà hold_expires_at đã qua thì thực chất đang TRỐNG — job dọn
    // giữ ghế chạy theo chu kỳ nên trạng thái trong bảng luôn trễ vài phút.
    // Báo "hết ghế" trong khi ghế đã tự nhả là kiểu sai khiến người dùng bỏ đi.
    const effectiveStatus = (s: ShowtimeSeat): string => {
      if (
        s.status === 'HELD' &&
        s.holdExpiresAt &&
        new Date(s.holdExpiresAt).getTime() < now
      ) {
        return 'AVAILABLE';
      }
      return s.status;
    };

    const available = seats.filter((s) => effectiveStatus(s) === 'AVAILABLE');

    const result: SeatAvailability = {
      showtimeId,
      movieTitle: showtime.movie?.title,
      startTime: this.formatDateTime(showtime.startTime),
      cinema: showtime.room?.cinema?.cinemaName,
      room: showtime.room?.roomName,
      totalSeats: seats.length,
      availableSeats: available.length,
      soldOut: available.length === 0,
      sampleAvailableLabels: available
        .slice(0, 12)
        .map((s) => s.seat?.seatLabel)
        .filter(Boolean),
    };

    const rawLabels = args?.seatLabels;
    const labels = Array.isArray(rawLabels)
      ? rawLabels
      : typeof rawLabels === 'string'
        ? rawLabels.split(/[,\s]+/)
        : [];

    const wanted = labels
      .map((l) => String(l).trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10);

    if (wanted.length > 0) {
      result.requestedSeats = wanted.map((label) => {
        const match = seats.find(
          (s) => (s.seat?.seatLabel ?? '').toUpperCase() === label,
        );
        if (!match) {
          return { label, status: 'NOT_FOUND' };
        }
        return {
          label,
          status: effectiveStatus(match),
          price: formatVnd(match.price),
        };
      });
    }

    return result;
  }

  // =====================================================================
  // 5. COMBO BẮP NƯỚC
  // =====================================================================
  async listCombos(args: { limit?: number }) {
    const limit = clampLimit(args?.limit, 10);

    const combos = await this.comboRepo
      .createQueryBuilder('c')
      .where('c.status = :active', { active: 'ACTIVE' })
      .orderBy('c.price', 'ASC')
      .take(limit)
      .getMany();

    return {
      count: combos.length,
      combos: combos.map((c) => ({
        comboId: c.comboId,
        name: c.name,
        description: c.description,
        price: formatVnd(c.price),
      })),
    };
  }

  // =====================================================================
  // 6. DANH SÁCH RẠP
  // =====================================================================
  async listCinemas(args: { city?: string; limit?: number }) {
    const limit = clampLimit(args?.limit, 15);

    const qb = this.cinemaRepo
      .createQueryBuilder('c')
      .where('c.status = :active', { active: 'ACTIVE' })
      .orderBy('c.cinemaName', 'ASC')
      .take(limit);

    if (args?.city) {
      qb.andWhere('c.city LIKE :city', { city: `%${String(args.city).trim()}%` });
    }

    const cinemas = await qb.getMany();

    return {
      count: cinemas.length,
      cinemas: cinemas.map((c) => ({
        cinemaId: c.cinemaId,
        name: c.cinemaName,
        address: c.address,
        city: c.city,
        district: c.district,
        phone: c.phone,
      })),
    };
  }

  // =====================================================================
  private formatDateTime(value: Date | string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;

    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }
}
