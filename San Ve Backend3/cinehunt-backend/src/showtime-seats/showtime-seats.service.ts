import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold, SeatHoldStatus } from '../entities/seat-hold.entity';
import { Showtime } from '../entities/showtime.entity';
import type {
  SeatMapResponseDto,
  SeatMapSeatStatus,
} from './dto/seat-map-response.dto';
import { SeatHoldService } from './seat-hold/seat-hold.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';

@Injectable()
export class ShowtimeSeatsService {
  private readonly logger = new Logger(ShowtimeSeatsService.name);

  constructor(
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    // FIX BUG-02: cần Showtime để phân biệt "suất chiếu không tồn tại" (404 thật)
    // với "suất chiếu tồn tại nhưng chưa sinh ghế" (200 + seats: []).
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    private readonly seatHoldService: SeatHoldService,
    private readonly dataSource: DataSource,
  ) {}

  async getHello() {
    return { message: 'showtime-seats module ok' };
  }

  async getSeatMap(showtimeId: number): Promise<SeatMapResponseDto> {
    // FIX BUG-02: kiểm tra sự tồn tại của suất chiếu TRƯỚC.
    // 404 giờ chỉ có đúng MỘT ý nghĩa: showtimeId không có thật.
    const showtime = await this.showtimeRepository.findOne({
      where: { showtimeId },
      relations: ['room', 'room.cinema'],
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu #${showtimeId}`);
    }

    // Không join showtime.movie qua TypeORM vì sẽ SELECT movies.cast
    // (reserved keyword, TypeORM không tự escape → QueryFailedError 500)
    // Thay vào đó: chỉ join những thứ cần, lấy movieTitle bằng raw query riêng
    const seats = await this.showtimeSeatRepository.find({
      where: { showtimeId },
      relations: [
        'seat',
        'seat.seatType',
        'showtime',
        // KHOÂNG join showtime.movie — tránh SELECT movies.[cast] / movies.cast
        'showtime.room',
        'showtime.room.cinema',
      ],
      order: {
        seat: { seatRow: 'ASC', seatNumber: 'ASC' },
      },
    });

    // Lấy movieTitle bằng raw query — chỉ chọn cột title, không SELECT *
    let movieTitle: string | null = null;
    try {
      const rows = await this.dataSource.query(
        `SELECT m.title
         FROM showtimes st
         JOIN movies m ON m.movie_id = st.movie_id
         WHERE st.showtime_id = @0`,
        [showtimeId],
      ) as Array<{ title: string }>;
      movieTitle = rows[0]?.title ?? null;
    } catch {
      // Nếu không lấy được movieTitle thì bỏ qua, không fail toàn bộ request
      movieTitle = null;
    }

    // Metadata lấy từ chính bản ghi showtime (không phụ thuộc vào việc có ghế
    // hay không) -> suất chiếu 0 ghế vẫn trả đủ tên rạp / phòng / giờ chiếu.
    return {
      showtimeId,
      movieTitle,
      cinemaName: showtime.room?.cinema?.cinemaName ?? null,
      roomName:   showtime.room?.roomName ?? null,
      startTime:  showtime.startTime ?? null,
      endTime:    showtime.endTime ?? null,

      totalSeats: seats.length,
      // FIX BUG-02: false = suất chiếu có thật nhưng CHƯA được sinh ghế.
      // Admin cần gọi POST /showtimes/admin/:id/generate-seats để vá.
      seatsGenerated: seats.length > 0,

      // FIX BUG-03: trả về đúng tên field mà frontend dùng (id/rowName/type/status),
      // các tên cũ giữ lại làm alias @deprecated để deploy lệch phiên bản không vỡ.
      seats: seats.map((item) => {
        const status = item.status as SeatMapSeatStatus;
        const rowName = item.seat?.seatRow ?? null;
        const typeCode = item.seat?.seatType?.typeCode ?? null;

        return {
          id:            item.showtimeSeatId,
          seatId:        item.seatId,
          showtimeId:    item.showtimeId,
          rowName,
          seatNumber:    item.seat?.seatNumber ?? null,
          seatLabel:     item.seat?.seatLabel  ?? null,
          type:          typeCode,
          typeName:      item.seat?.seatType?.typeName ?? null,
          seatTypeId:    item.seat?.seatTypeId ?? null,
          status,
          price:         Number(item.price),
          heldByUserId:  item.heldByUserId,
          holdExpiresAt: item.holdExpiresAt,

          // alias tương thích ngược
          showtimeSeatId: item.showtimeSeatId,
          seatRow:        rowName,
          seatTypeCode:   typeCode,
          seatStatus:     status,
        };
      }),
    };
  }

  async holdSeat(userId: number, dto: HoldSeatDto) {
    return this.seatHoldService.holdSingleSeat(userId, dto);
  }

  async holdManySeats(userId: number, dto: HoldManySeatsDto) {
    return this.seatHoldService.holdMultipleSeats(userId, {
      showtimeSeatIds: dto.showtimeSeatIds,
      holdMinutes:     dto.holdMinutes,
    });
  }

  async getMyHolds(userId: number) {
    return this.seatHoldService.getUserHolds(userId);
  }

  async getHoldDetails(userId: number, holdId: number) {
    return this.seatHoldService.getHoldDetails(String(holdId), userId);
  }

  async releaseHold(userId: number, holdId: number) {
    await this.seatHoldService.releaseHold(String(holdId), userId);
    return { message: 'Release hold thành công', holdId };
  }

  /**
   * FIX BUG-09 — Giải phóng ghế giữ đã hết hạn.
   *
   * Trước đây hàm chỉ `EXEC sp_release_expired_holds` rồi nuốt mọi lỗi thành
   * một `InternalServerErrorException` chung chung. Trên môi trường dev mới
   * setup (chưa chạy file SQL tạo procedure), scheduler chạy mỗi phút sẽ fail
   * âm thầm và ghế HELD hết hạn KHÔNG BAO GIỜ được trả lại — ghế bị kẹt vĩnh viễn.
   *
   * Nay: thử stored procedure trước (nhanh, chạy trong 1 transaction ở DB);
   * nếu procedure không tồn tại thì tự chạy logic tương đương bằng TypeORM.
   */
  async expireSeatHolds(): Promise<{
    message: string;
    strategy: 'stored-procedure' | 'fallback';
    releasedSeats?: number;
    expiredHolds?: number;
  }> {
    try {
      await this.dataSource.query('EXEC sp_release_expired_holds');
      return { message: 'Expired seat holds released', strategy: 'stored-procedure' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // SQL Server: 2812 = "Could not find stored procedure"
      const procedureMissing =
        (error as { number?: number })?.number === 2812 ||
        /could not find stored procedure|kh(ô|o)ng t(ì|i)m th(ấ|a)y th(ủ|u) t(ụ|u)c/i.test(
          message,
        );

      if (!procedureMissing) {
        this.logger.error(`sp_release_expired_holds lỗi: ${message}`);
        throw new InternalServerErrorException(
          `Không thể giải phóng ghế giữ hết hạn: ${message}`,
        );
      }

      this.logger.warn(
        'Chưa có stored procedure sp_release_expired_holds — dùng fallback TypeORM. ' +
          'Nên chạy file SQL để tạo procedure (nhanh và an toàn hơn).',
      );
      return this.expireSeatHoldsFallback();
    }
  }

  /**
   * Bản TypeORM tương đương phần cốt lõi của `sp_release_expired_holds`:
   * trả ghế HELD quá hạn về AVAILABLE và đánh dấu seat_holds tương ứng EXPIRED.
   * Chạy trong transaction để hai bảng không bị lệch nhau.
   */
  private async expireSeatHoldsFallback(): Promise<{
    message: string;
    strategy: 'fallback';
    releasedSeats: number;
    expiredHolds: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();

      const seatResult = await manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: 'AVAILABLE', heldByUserId: null, holdExpiresAt: null })
        .where('status = :held', { held: 'HELD' })
        .andWhere('hold_expires_at IS NOT NULL')
        .andWhere('hold_expires_at <= :now', { now })
        .execute();

      const holdResult = await manager
        .createQueryBuilder()
        .update(SeatHold)
        .set({ status: SeatHoldStatus.EXPIRED, releasedAt: now })
        .where('status = :active', { active: SeatHoldStatus.ACTIVE })
        .andWhere('expires_at <= :now', { now })
        .execute();

      const releasedSeats = seatResult.affected ?? 0;
      const expiredHolds = holdResult.affected ?? 0;

      if (releasedSeats > 0 || expiredHolds > 0) {
        this.logger.log(
          `Fallback: trả lại ${releasedSeats} ghế, đánh dấu ${expiredHolds} hold hết hạn`,
        );
      }

      return {
        message: 'Expired seat holds released (fallback)',
        strategy: 'fallback' as const,
        releasedSeats,
        expiredHolds,
      };
    });
  }
}
