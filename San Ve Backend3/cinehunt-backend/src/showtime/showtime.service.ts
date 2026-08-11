import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { Showtime } from '../entities/showtime.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { Room } from '../entities/room.entity';
import { Seat } from '../entities/seat.entity';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { assertNotStale } from '../common/utils/optimistic-lock.util';

@Injectable()
export class ShowtimeService {
  private readonly logger = new Logger(ShowtimeService.name);

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: { status: Not('CANCELLED') },
      relations: ['room', 'room.cinema'],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Showtime> {
    const showtime = await this.showtimeRepository.findOne({
      where: { showtimeId: id },
      relations: ['room', 'room.cinema'],
    });
    if (!showtime) throw new NotFoundException('Showtime not found');
    return showtime;
  }

  async findByMovie(movieId: number): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: { movieId, status: 'OPEN' },
      relations: ['room', 'room.cinema'],
      order: { startTime: 'ASC' },
    });
  }

  async findByRoom(roomId: number): Promise<Showtime[]> {
    return this.showtimeRepository.find({
      where: { roomId, status: Not('CANCELLED') },
      relations: ['room', 'room.cinema'],
      order: { startTime: 'ASC' },
    });
  }

  private validateTimeRange(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new ConflictException(
        'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
      );
    }
  }

  private async acquireRoomScheduleLock(
    manager: EntityManager,
    roomId: number,
  ): Promise<void> {
    const rows = (await manager.query(
      `
        DECLARE @LockResult INT;

        EXEC @LockResult = sys.sp_getapplock
          @Resource = @0,
          @LockMode = 'Exclusive',
          @LockOwner = 'Transaction',
          @LockTimeout = 10000;

        SELECT @LockResult AS lock_result;
      `,
      [`CineHunt.ShowtimeRoom.${roomId}`],
    )) as Array<{ lock_result: number }>;

    if (Number(rows[0]?.lock_result ?? -999) < 0) {
      throw new ConflictException(
        `Không lấy được khóa lịch chiếu cho phòng #${roomId}. Vui lòng thử lại.`,
      );
    }
  }

  private async ensureNoScheduleOverlap(
    manager: EntityManager,
    roomId: number,
    startTime: Date,
    endTime: Date,
    excludeShowtimeId?: number,
  ): Promise<void> {
    const qb = manager
      .getRepository(Showtime)
      .createQueryBuilder('showtime')
      .where('showtime.roomId = :roomId', { roomId })
      .andWhere('showtime.status != :cancelledStatus', {
        cancelledStatus: 'CANCELLED',
      })
      .andWhere('showtime.startTime < :endTime', { endTime })
      .andWhere('showtime.endTime > :startTime', { startTime });

    if (excludeShowtimeId) {
      qb.andWhere('showtime.showtimeId != :excludeShowtimeId', {
        excludeShowtimeId,
      });
    }

    const overlappingShowtime = await qb.getOne();
    if (overlappingShowtime) {
      throw new ConflictException(
        'Lịch chiếu bị trùng thời gian với một suất chiếu khác trong cùng phòng',
      );
    }
  }

  private async seedSeatsForShowtime(
    manager: EntityManager,
    showtimeId: number,
    roomId: number,
    basePrice: number,
  ): Promise<number> {
    const seats = await manager.find(Seat, {
      where: { roomId },
      relations: ['seatType'],
    });

    if (seats.length === 0) {
      this.logger.warn(
        `Phòng #${roomId} chưa có ghế nào -> suất chiếu #${showtimeId} được tạo với 0 ghế`,
      );
      return 0;
    }

    const existing = await manager.find(ShowtimeSeat, {
      where: { showtimeId },
      select: { seatId: true },
    });
    const existingSeatIds = new Set(existing.map((e) => e.seatId));

    const rows = seats
      .filter((seat) => !existingSeatIds.has(seat.seatId))
      .map((seat) => {
        const multiplier = Number(seat.seatType?.priceMultiplier ?? 1);
        return manager.create(ShowtimeSeat, {
          showtimeId,
          seatId: seat.seatId,
          price: Math.round(Number(basePrice) * multiplier),
          status: seat.status === 'ACTIVE' ? ('AVAILABLE' as const) : ('BLOCKED' as const),
          heldByUserId: null,
          holdExpiresAt: null,
        });
      });

    if (rows.length === 0) return 0;

    await manager.save(ShowtimeSeat, rows, { chunk: 200 });
    return rows.length;
  }

  private async assertNoCommittedSeats(
    manager: EntityManager,
    showtimeId: number,
    action: string,
  ): Promise<void> {
    const committed = await manager.count(ShowtimeSeat, {
      where: { showtimeId, status: In(['SOLD', 'HELD']) },
    });
    if (committed > 0) {
      throw new ConflictException(
        `Không thể ${action}: suất chiếu đã có ${committed} ghế được giữ hoặc đã bán.`,
      );
    }
  }


  private async cancelShowtimeWorkflow(
    manager: EntityManager,
    showtimeId: number,
  ): Promise<void> {
    const usedTickets = (await manager.query(
      `
        SELECT TOP (1) t.ticket_id
        FROM dbo.tickets AS t WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.booking_details AS bd WITH (UPDLOCK, HOLDLOCK)
          ON bd.booking_detail_id = t.booking_detail_id
        INNER JOIN dbo.booking_orders AS bo WITH (UPDLOCK, HOLDLOCK)
          ON bo.booking_id = bd.booking_id
        WHERE bo.showtime_id = @0
          AND t.ticket_status = 'USED';
      `,
      [showtimeId],
    )) as Array<{ ticket_id: string }>;

    if (usedTickets.length > 0) {
      throw new ConflictException(
        'Không thể hủy suất chiếu đã có vé được check-in',
      );
    }

    const now = new Date();

    await manager.query(
      `
        UPDATE p
        SET
          p.payment_status = 'FAILED',
          p.failed_reason = COALESCE(
            NULLIF(p.failed_reason, ''),
            'Showtime cancelled'
          )
        FROM dbo.payments AS p
        INNER JOIN dbo.booking_orders AS bo
          ON bo.booking_id = p.booking_id
        WHERE bo.showtime_id = @0
          AND p.payment_status = 'PENDING';

        UPDATE t
        SET t.ticket_status = 'CANCELLED'
        FROM dbo.tickets AS t
        INNER JOIN dbo.booking_details AS bd
          ON bd.booking_detail_id = t.booking_detail_id
        INNER JOIN dbo.booking_orders AS bo
          ON bo.booking_id = bd.booking_id
        WHERE bo.showtime_id = @0
          AND t.ticket_status = 'VALID';

        UPDATE h
        SET
          h.status = 'CANCELLED',
          h.released_at = @1
        FROM dbo.seat_holds AS h
        INNER JOIN dbo.showtime_seats AS ss
          ON ss.showtime_seat_id = h.showtime_seat_id
        WHERE ss.showtime_id = @0
          AND h.status IN ('ACTIVE', 'CONVERTED', 'CONFIRMED');

        UPDATE bd
        SET bd.status = 'CANCELLED'
        FROM dbo.booking_details AS bd
        INNER JOIN dbo.booking_orders AS bo
          ON bo.booking_id = bd.booking_id
        WHERE bo.showtime_id = @0
          AND bd.status = 'ACTIVE';

        UPDATE bo
        SET
          bo.status = 'CANCELLED',
          bo.cancelled_at = COALESCE(bo.cancelled_at, @1)
        FROM dbo.booking_orders AS bo
        WHERE bo.showtime_id = @0
          AND bo.status IN (
            'PENDING_PAYMENT',
            'PAID',
            'ISSUED',
            'CONFIRMED'
          );

        UPDATE dbo.showtime_seats
        SET
          status = 'BLOCKED',
          held_by_user_id = NULL,
          hold_expires_at = NULL
        WHERE showtime_id = @0;
      `,
      [showtimeId, now],
    );
  }

  async generateSeats(showtimeId: number): Promise<{
    message: string;
    showtimeId: number;
    created: number;
    total: number;
  }> {
    const showtime = await this.findOne(showtimeId);

    const created = await this.dataSource.transaction((manager) =>
      this.seedSeatsForShowtime(
        manager,
        showtime.showtimeId,
        showtime.roomId,
        Number(showtime.basePrice),
      ),
    );

    const total = await this.showtimeSeatRepository.count({
      where: { showtimeId: showtime.showtimeId },
    });

    return {
      message: created > 0 ? `Đã sinh thêm ${created} ghế` : 'Suất chiếu đã có đủ ghế',
      showtimeId: showtime.showtimeId,
      created,
      total,
    };
  }

  async create(dto: CreateShowtimeDto): Promise<Showtime> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    this.validateTimeRange(startTime, endTime);

    return this.dataSource.transaction(async (manager) => {
      const room = await manager.findOne(Room, {
        where: { roomId: dto.roomId },
      });

      if (!room) {
        throw new NotFoundException(
          `Không tìm thấy phòng chiếu #${dto.roomId}`,
        );
      }

      await this.acquireRoomScheduleLock(manager, dto.roomId);
      await this.ensureNoScheduleOverlap(
        manager,
        dto.roomId,
        startTime,
        endTime,
      );

      const saved = await manager.save(
        manager.create(Showtime, {
          movieId: dto.movieId,
          roomId: dto.roomId,
          startTime,
          endTime,
          basePrice: dto.basePrice,
          status: dto.status ?? 'OPEN',
        }),
      );

      const created = await this.seedSeatsForShowtime(
        manager,
        saved.showtimeId,
        saved.roomId,
        Number(saved.basePrice),
      );

      this.logger.log(
        `Suất chiếu #${saved.showtimeId}: đã sinh ${created} ghế`,
      );

      return saved;
    });
  }

  async update(id: number, dto: UpdateShowtimeDto): Promise<Showtime> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(Showtime)
        .createQueryBuilder('showtime')
        .addSelect('showtime.updatedAt')
        .setLock('pessimistic_write')
        .where('showtime.showtimeId = :id', { id })
        .getOne();

      if (!existing) {
        throw new NotFoundException('Showtime not found');
      }

      assertNotStale(
        existing.updatedAt,
        dto.expectedUpdatedAt,
        'Suất chiếu này',
      );

      const nextMovieId = dto.movieId ?? existing.movieId;
      const nextRoomId = dto.roomId ?? existing.roomId;
      const nextStartTime = dto.startTime
        ? new Date(dto.startTime)
        : existing.startTime;
      const nextEndTime = dto.endTime
        ? new Date(dto.endTime)
        : existing.endTime;
      const nextBasePrice = dto.basePrice ?? existing.basePrice;
      const nextStatus = dto.status ?? existing.status;

      this.validateTimeRange(nextStartTime, nextEndTime);

      if (
        existing.status === 'CANCELLED' &&
        nextStatus !== 'CANCELLED'
      ) {
        throw new ConflictException(
          'Không thể mở lại một suất chiếu đã hủy',
        );
      }

      const room = await manager.findOne(Room, {
        where: { roomId: nextRoomId },
      });
      if (!room) {
        throw new NotFoundException(
          `Không tìm thấy phòng chiếu #${nextRoomId}`,
        );
      }

      const roomIdsToLock = [
        ...new Set([existing.roomId, nextRoomId]),
      ].sort((left, right) => left - right);

      for (const roomId of roomIdsToLock) {
        await this.acquireRoomScheduleLock(manager, roomId);
      }

      if (nextStatus !== 'CANCELLED') {
        await this.ensureNoScheduleOverlap(
          manager,
          nextRoomId,
          nextStartTime,
          nextEndTime,
          id,
        );
      }

      const roomChanged = nextRoomId !== existing.roomId;
      const priceChanged =
        Number(nextBasePrice) !== Number(existing.basePrice);

      if (roomChanged && nextStatus !== 'CANCELLED') {
        await this.assertNoCommittedSeats(
          manager,
          id,
          'đổi phòng chiếu',
        );
      }

      if (
        nextStatus === 'CANCELLED' &&
        existing.status !== 'CANCELLED'
      ) {
        await this.cancelShowtimeWorkflow(manager, id);
      }

      const updated = await manager.save(
        manager.merge(Showtime, existing, {
          movieId: nextMovieId,
          roomId: nextRoomId,
          startTime: nextStartTime,
          endTime: nextEndTime,
          basePrice: nextBasePrice,
          status: nextStatus,
        }),
      );

      if (nextStatus === 'CANCELLED') {
        return updated;
      }

      if (roomChanged) {
        await manager.delete(ShowtimeSeat, { showtimeId: id });
        const created = await this.seedSeatsForShowtime(
          manager,
          id,
          nextRoomId,
          Number(nextBasePrice),
        );
        this.logger.log(
          `Suất chiếu #${id} đổi phòng -> sinh lại ${created} ghế`,
        );
      } else if (priceChanged) {
        const seats = await manager.find(ShowtimeSeat, {
          where: {
            showtimeId: id,
            status: In(['AVAILABLE', 'BLOCKED']),
          },
          relations: ['seat', 'seat.seatType'],
        });

        seats.forEach((ss) => {
          const multiplier = Number(
            ss.seat?.seatType?.priceMultiplier ?? 1,
          );
          ss.price = Math.round(
            Number(nextBasePrice) * multiplier,
          );
        });

        if (seats.length > 0) {
          await manager.save(ShowtimeSeat, seats, { chunk: 200 });
        }

        this.logger.log(
          `Suất chiếu #${id} đổi giá -> cập nhật ${seats.length} ghế`,
        );
      }

      return updated;
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(Showtime)
        .createQueryBuilder('showtime')
        .setLock('pessimistic_write')
        .where('showtime.showtimeId = :id', { id })
        .getOne();

      if (!existing) {
        throw new NotFoundException('Showtime not found');
      }

      if (existing.status === 'CANCELLED') {
        return { message: 'Showtime already cancelled' };
      }

      await this.acquireRoomScheduleLock(
        manager,
        existing.roomId,
      );
      await this.cancelShowtimeWorkflow(manager, id);

      existing.status = 'CANCELLED';
      await manager.save(Showtime, existing);

      this.logger.log(
        `Hủy suất chiếu #${id}: đã vô hiệu hóa booking, ticket, hold và khóa toàn bộ ghế`,
      );

      return { message: 'Showtime cancelled successfully' };
    });
  }
}
