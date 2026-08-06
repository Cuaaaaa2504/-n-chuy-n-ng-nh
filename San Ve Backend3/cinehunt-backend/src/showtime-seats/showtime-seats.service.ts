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
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    private readonly seatHoldService: SeatHoldService,
    private readonly dataSource: DataSource,
  ) {}

  async getHello() {
    return { message: 'showtime-seats module ok' };
  }

  async getSeatMap(showtimeId: number): Promise<SeatMapResponseDto> {
    const showtime = await this.showtimeRepository.findOne({
      where: { showtimeId },
      relations: ['room', 'room.cinema'],
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu #${showtimeId}`);
    }

    const seats = await this.showtimeSeatRepository.find({
      where: { showtimeId },
      relations: [
        'seat',
        'seat.seatType',
        'showtime',
        'showtime.room',
        'showtime.room.cinema',
      ],
      order: {
        seat: { seatRow: 'ASC', seatNumber: 'ASC' },
      },
    });

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
      movieTitle = null;
    }

    return {
      showtimeId,
      movieTitle,
      cinemaName: showtime.room?.cinema?.cinemaName ?? null,
      roomName:   showtime.room?.roomName ?? null,
      startTime:  showtime.startTime ?? null,
      endTime:    showtime.endTime ?? null,

      totalSeats: seats.length,
      seatsGenerated: seats.length > 0,

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

  async expireSeatHolds(): Promise<{
    message: string;
    strategy: 'stored-procedure' | 'fallback';
    releasedSeats?: number;
    expiredHolds?: number;
  }> {
    const retryDelays = [150, 400, 900];

    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      try {
        await this.dataSource.query('EXEC sp_release_expired_holds');
        return {
          message: 'Expired seat holds released',
          strategy: 'stored-procedure',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.isDeadlock(error) && attempt < retryDelays.length) {
          const delayMs = retryDelays[attempt];
          this.logger.warn(
            `sp_release_expired_holds gặp deadlock, thử lại sau ${delayMs}ms ` +
              `(lần ${attempt + 2}/${retryDelays.length + 1}).`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const procedureMissing =
          this.getSqlErrorNumber(error) === 2812 ||
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

    throw new InternalServerErrorException(
      'Không thể giải phóng ghế giữ hết hạn sau nhiều lần thử.',
    );
  }

  private getSqlErrorNumber(error: unknown): number | undefined {
    const sqlError = error as {
      number?: number;
      originalError?: { info?: { number?: number } };
    };
    return sqlError.number ?? sqlError.originalError?.info?.number;
  }

  private isDeadlock(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      this.getSqlErrorNumber(error) === 1205 ||
      /deadlock victim|was deadlocked/i.test(message)
    );
  }

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
