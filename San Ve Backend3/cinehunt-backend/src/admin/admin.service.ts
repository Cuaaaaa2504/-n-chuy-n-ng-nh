import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../entities/movie.entity';
import { Showtime } from '../entities/showtime.entity';
import { BookingOrder } from '../entities/booking-order.entity';
import { User } from '../entities/user.entity';
import { RevenueQueryDto } from './dto/revenue-query.dto';

/** Trạng thái được tính là "đã thu tiền" */
const PAID_STATUSES = ['PAID', 'CONFIRMED'];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Movie) private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Showtime) private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(BookingOrder) private readonly bookingRepo: Repository<BookingOrder>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * FIX: GET /admin/stats trước đây chưa được implement — AdminDashboardPage
   * phải fallback sang mock data nên số liệu không phản ánh thực tế.
   */
  async getStats() {
    try {
      const [
        totalMovies,
        totalShowtimes,
        totalBookings,
        totalPaidBookings,
        totalUsers,
        revenueRow,
      ] = await Promise.all([
        this.movieRepo.count(),
        this.showtimeRepo.count(),
        this.bookingRepo.count(),
        this.bookingRepo
          .createQueryBuilder('b')
          .where('b.status IN (:...statuses)', { statuses: PAID_STATUSES })
          .getCount(),
        this.userRepo.count(),
        this.bookingRepo
          .createQueryBuilder('b')
          .select('SUM(b.totalAmount)', 'total')
          .where('b.status IN (:...statuses)', { statuses: PAID_STATUSES })
          .getRawOne<{ total: string | null }>(),
      ]);

      return {
        totalMovies,
        totalShowtimes,
        totalBookings,
        totalPaidBookings,
        totalRevenue: Number(revenueRow?.total ?? 0),
        totalUsers,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      throw new InternalServerErrorException('Không tải được thống kê hệ thống');
    }
  }

  /**
   * FIX: GET /admin/reports/revenue — báo cáo doanh thu theo ngày/tháng/phim/rạp.
   */
  async getRevenueReport(query: RevenueQueryDto) {
    const groupBy = query.groupBy ?? 'day';

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.status IN (:...statuses)', { statuses: PAID_STATUSES });

    if (query.fromDate) {
      qb.andWhere('b.createdAt >= :fromDate', { fromDate: new Date(query.fromDate) });
    }
    if (query.toDate) {
      qb.andWhere('b.createdAt <= :toDate', { toDate: new Date(query.toDate) });
    }

    // SQL Server: CONVERT(date, ...) / FORMAT(...) để nhóm theo ngày & tháng
    switch (groupBy) {
      case 'month':
        qb.select("FORMAT(b.createdAt, 'yyyy-MM')", 'label')
          .addSelect('COUNT(b.bookingId)', 'bookings')
          .addSelect('SUM(b.totalAmount)', 'revenue')
          .groupBy("FORMAT(b.createdAt, 'yyyy-MM')")
          .orderBy('label', 'ASC');
        break;

      case 'movie':
        qb.innerJoin('b.showtime', 'showtime')
          .innerJoin('showtime.movie', 'movie')
          .select('movie.title', 'label')
          .addSelect('movie.movieId', 'refId')
          .addSelect('COUNT(b.bookingId)', 'bookings')
          .addSelect('SUM(b.totalAmount)', 'revenue')
          .groupBy('movie.movieId')
          .addGroupBy('movie.title')
          .orderBy('revenue', 'DESC');
        break;

      case 'cinema':
        qb.innerJoin('b.showtime', 'showtime')
          .innerJoin('showtime.room', 'room')
          .innerJoin('room.cinema', 'cinema')
          .select('cinema.cinemaName', 'label')
          .addSelect('cinema.cinemaId', 'refId')
          .addSelect('COUNT(b.bookingId)', 'bookings')
          .addSelect('SUM(b.totalAmount)', 'revenue')
          .groupBy('cinema.cinemaId')
          .addGroupBy('cinema.cinemaName')
          .orderBy('revenue', 'DESC');
        break;

      case 'day':
      default:
        qb.select('CONVERT(varchar(10), b.createdAt, 23)', 'label')
          .addSelect('COUNT(b.bookingId)', 'bookings')
          .addSelect('SUM(b.totalAmount)', 'revenue')
          .groupBy('CONVERT(varchar(10), b.createdAt, 23)')
          .orderBy('label', 'ASC');
        break;
    }

    const rows = await qb.getRawMany<{
      label: string;
      refId?: number;
      bookings: string;
      revenue: string;
    }>();

    const items = rows.map((r) => ({
      label: r.label,
      refId: r.refId ?? null,
      bookings: Number(r.bookings ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));

    return {
      groupBy,
      fromDate: query.fromDate ?? null,
      toDate: query.toDate ?? null,
      items,
      totalBookings: items.reduce((sum, i) => sum + i.bookings, 0),
      totalRevenue: items.reduce((sum, i) => sum + i.revenue, 0),
    };
  }
}
