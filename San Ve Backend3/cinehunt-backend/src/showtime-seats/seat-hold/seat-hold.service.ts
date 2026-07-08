import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SeatHold } from '../../entities/seat-hold.entity';
import { ShowtimeSeat } from '../../entities/showtime-seat.entity';
import { HoldSeatDto, HoldSeatsDto, HoldResponseDto } from './dto';

@Injectable()
export class SeatHoldService {
  constructor(
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    private readonly dataSource: DataSource,
  ) {}

  async holdSingleSeat(userId: number, dto: HoldSeatDto): Promise<HoldResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { showtimeSeatId, holdMinutes = 5 } = dto;

      // FIX: dùng pessimistic_write lock để tránh race condition double-booking
      const showtimeSeat = await queryRunner.manager.findOne(ShowtimeSeat, {
        where: { showtimeSeatId },
        relations: ['showtime', 'showtime.movie', 'showtime.room', 'showtime.room.cinema', 'seat'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!showtimeSeat) throw new NotFoundException('Ghế không tồn tại');

      if (showtimeSeat.status !== 'AVAILABLE') {
        throw new BadRequestException('Ghế không còn trống');
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      await queryRunner.manager.update(ShowtimeSeat, { showtimeSeatId }, {
        status: 'HELD',
        heldByUserId: userId,
        holdExpiresAt: expiresAt,
      });

      // FIX: holdToken dùng NEWID() từ DB thay vì crypto.randomUUID() để tương thích uniqueidentifier
      const hold = queryRunner.manager.create(SeatHold, {
        userId,
        showtimeSeatId,
        expiresAt,
        status: 'ACTIVE',
      });

      let savedHold: SeatHold;
      try {
        savedHold = await queryRunner.manager.save(SeatHold, hold);
      } catch (err: any) {
        // FIX: bắt SQL unique constraint violation (UX_seat_holds_active_seat) → trả lỗi rõ ràng
        if (err?.number === 2601 || err?.number === 2627 || err?.code === 'ER_DUP_ENTRY') {
          throw new ConflictException('Ghế đang được giữ bởi người dùng khác');
        }
        throw err;
      }

      await queryRunner.commitTransaction();

      return {
        holdId: savedHold.holdId,
        holdToken: savedHold.holdToken,
        expiresAt: savedHold.expiresAt,
        status: savedHold.status,
        showtimeSeatId,
        seatLabel: showtimeSeat.seat?.seatLabel ??
          `${showtimeSeat.seat?.seatRow ?? ''}${showtimeSeat.seat?.seatNumber ?? ''}`,
        price: Number(showtimeSeat.price),
        showtimeInfo: {
          movieTitle: showtimeSeat.showtime?.movie?.title ?? '',
          startTime: showtimeSeat.showtime?.startTime,
          cinemaName: showtimeSeat.showtime?.room?.cinema?.cinemaName,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async holdMultipleSeats(userId: number, dto: HoldSeatsDto): Promise<HoldResponseDto[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { showtimeSeatIds, holdMinutes = 5 } = dto;

      if (!showtimeSeatIds || showtimeSeatIds.length === 0) {
        throw new BadRequestException('Danh sách ghế không hợp lệ');
      }

      // FIX: dùng pessimistic_write lock cho toàn bộ danh sách ghế
      const showtimeSeats = await queryRunner.manager.find(ShowtimeSeat, {
        where: { showtimeSeatId: In(showtimeSeatIds) },
        relations: ['showtime', 'showtime.movie', 'showtime.room', 'showtime.room.cinema', 'seat'],
        lock: { mode: 'pessimistic_write' },
      });

      if (showtimeSeats.length !== showtimeSeatIds.length) {
        throw new NotFoundException('Một hoặc nhiều ghế không tồn tại');
      }

      const showtimeId = showtimeSeats[0].showtimeId;
      const sameShowtime = showtimeSeats.every((seat) => seat.showtimeId === showtimeId);

      if (!sameShowtime) {
        throw new BadRequestException('Tất cả ghế phải thuộc cùng một suất chiếu');
      }

      const notAvailable = showtimeSeats.filter((seat) => seat.status !== 'AVAILABLE');

      if (notAvailable.length > 0) {
        throw new BadRequestException(
          `Các ghế không còn trống: ${notAvailable
            .map((seat) => seat.seat?.seatLabel ?? `${seat.seat?.seatRow ?? ''}${seat.seat?.seatNumber ?? ''}`)
            .join(', ')}`,
        );
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      const responses: HoldResponseDto[] = [];

      for (const showtimeSeat of showtimeSeats) {
        await queryRunner.manager.update(ShowtimeSeat, { showtimeSeatId: showtimeSeat.showtimeSeatId }, {
          status: 'HELD',
          heldByUserId: userId,
          holdExpiresAt: expiresAt,
        });

        // FIX: bỏ crypto.randomUUID(), để NEWID() default của DB tạo holdToken
        const hold = queryRunner.manager.create(SeatHold, {
          userId,
          showtimeSeatId: showtimeSeat.showtimeSeatId,
          expiresAt,
          status: 'ACTIVE',
        });

        let savedHold: SeatHold;
        try {
          savedHold = await queryRunner.manager.save(SeatHold, hold);
        } catch (err: any) {
          if (err?.number === 2601 || err?.number === 2627 || err?.code === 'ER_DUP_ENTRY') {
            throw new ConflictException(
              `Ghế ${showtimeSeat.seat?.seatLabel ?? showtimeSeat.showtimeSeatId} đang được giữ bởi người dùng khác`,
            );
          }
          throw err;
        }

        responses.push({
          holdId: savedHold.holdId,
          holdToken: savedHold.holdToken,
          expiresAt: savedHold.expiresAt,
          status: savedHold.status,
          showtimeSeatId: showtimeSeat.showtimeSeatId,
          seatLabel: showtimeSeat.seat?.seatLabel ??
            `${showtimeSeat.seat?.seatRow ?? ''}${showtimeSeat.seat?.seatNumber ?? ''}`,
          price: Number(showtimeSeat.price),
          showtimeInfo: {
            movieTitle: showtimeSeat.showtime?.movie?.title ?? '',
            startTime: showtimeSeat.showtime?.startTime,
            cinemaName: showtimeSeat.showtime?.room?.cinema?.cinemaName,
          },
        });
      }

      await queryRunner.commitTransaction();
      return responses;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserHolds(userId: number) {
    const holds = await this.seatHoldRepository.find({
      where: { userId, status: 'ACTIVE' },
      relations: [
        'showtimeSeat',
        'showtimeSeat.seat',
        'showtimeSeat.showtime',
        'showtimeSeat.showtime.movie',
        'showtimeSeat.showtime.room',
        'showtimeSeat.showtime.room.cinema',
      ],
      order: { createdAt: 'DESC' },
    });

    return holds.map((hold) => ({
      holdId: hold.holdId,
      holdToken: hold.holdToken,
      expiresAt: hold.expiresAt,
      status: hold.status,
      showtimeSeatId: hold.showtimeSeat?.showtimeSeatId,
      seatLabel:
        hold.showtimeSeat?.seat?.seatLabel ??
        `${hold.showtimeSeat?.seat?.seatRow ?? ''}${hold.showtimeSeat?.seat?.seatNumber ?? ''}`,
      price: hold.showtimeSeat ? Number(hold.showtimeSeat.price) : 0,
      showtimeInfo: hold.showtimeSeat?.showtime
        ? {
            movieTitle: hold.showtimeSeat.showtime.movie?.title ?? '',
            startTime: hold.showtimeSeat.showtime.startTime,
            cinemaName: hold.showtimeSeat.showtime.room?.cinema?.cinemaName,
          }
        : undefined,
    }));
  }

  async getHoldDetails(holdId: string, userId: number) {
    const hold = await this.seatHoldRepository.findOne({
      where: { holdId, userId },
      relations: [
        'showtimeSeat',
        'showtimeSeat.seat',
        'showtimeSeat.showtime',
        'showtimeSeat.showtime.movie',
        'showtimeSeat.showtime.room',
        'showtimeSeat.showtime.room.cinema',
      ],
    });

    if (!hold) throw new NotFoundException('Không tìm thấy thông tin hold');

    return {
      holdId: hold.holdId,
      holdToken: hold.holdToken,
      expiresAt: hold.expiresAt,
      releasedAt: hold.releasedAt,
      status: hold.status,
      showtimeSeatId: hold.showtimeSeat?.showtimeSeatId,
      seatLabel:
        hold.showtimeSeat?.seat?.seatLabel ??
        `${hold.showtimeSeat?.seat?.seatRow ?? ''}${hold.showtimeSeat?.seat?.seatNumber ?? ''}`,
      price: hold.showtimeSeat ? Number(hold.showtimeSeat.price) : 0,
      showtimeInfo: hold.showtimeSeat?.showtime
        ? {
            movieTitle: hold.showtimeSeat.showtime.movie?.title ?? '',
            startTime: hold.showtimeSeat.showtime.startTime,
            cinemaName: hold.showtimeSeat.showtime.room?.cinema?.cinemaName,
          }
        : undefined,
    };
  }

  async releaseHold(holdId: string, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await queryRunner.manager.findOne(SeatHold, {
        where: { holdId, userId, status: 'ACTIVE' },
      });

      if (!hold) throw new NotFoundException('Không tìm thấy hold hợp lệ');

      await queryRunner.manager.update(
        SeatHold,
        { holdId },
        { status: 'CANCELLED', releasedAt: new Date() },
      );

      await queryRunner.manager.update(
        ShowtimeSeat,
        { showtimeSeatId: hold.showtimeSeatId },
        { status: 'AVAILABLE', heldByUserId: null, holdExpiresAt: null },
      );

      await queryRunner.commitTransaction();
      return { success: true, holdId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
