import {
  Injectable,
  BadRequestException,
  NotFoundException,
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

      const showtimeSeat = await queryRunner.manager.findOne(ShowtimeSeat, {
        where: { showtimeSeatId },
        relations: ['showtime', 'showtime.movie', 'showtime.room', 'showtime.room.cinema', 'seat'],
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

      const hold = this.seatHoldRepository.create({
        userId,
        showtimeSeatId,
        holdToken: crypto.randomUUID(),
        expiresAt,
        status: 'ACTIVE',
      });

      const savedHold = await queryRunner.manager.save(SeatHold, hold);

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

      const showtimeSeats = await queryRunner.manager.find(ShowtimeSeat, {
        where: { showtimeSeatId: In(showtimeSeatIds) },
        relations: ['showtime', 'showtime.movie', 'showtime.room', 'showtime.room.cinema', 'seat'],
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

        const hold = this.seatHoldRepository.create({
          userId,
          showtimeSeatId: showtimeSeat.showtimeSeatId,
          holdToken: crypto.randomUUID(),
          expiresAt,
          status: 'ACTIVE',
        });

        const savedHold = await queryRunner.manager.save(SeatHold, hold);

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

  async getHoldDetails(holdId: number, userId: number) {
    const hold = await this.seatHoldRepository.findOne({
      where: { holdId: String(holdId), userId },
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

  async releaseHold(holdId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await queryRunner.manager.findOne(SeatHold, {
        where: { holdId: String(holdId), userId, status: 'ACTIVE' },
      });

      if (!hold) throw new NotFoundException('Không tìm thấy hold hợp lệ');

      await queryRunner.manager.update(
        SeatHold,
        { holdId: String(holdId) },
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
