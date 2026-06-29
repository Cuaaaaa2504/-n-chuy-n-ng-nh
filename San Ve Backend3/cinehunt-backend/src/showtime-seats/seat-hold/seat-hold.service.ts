import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SeatHold } from '../../entities/seat-hold.entity';
import { ShowtimeSeat } from '../../entities/showtime-seat.entity';
import { HoldSeatDto, HoldSeatsDto, HoldResponseDto } from './dto';

@Injectable()
export class SeatHoldService {
  constructor(
    @InjectRepository(SeatHold)
    private seatHoldRepository: Repository<SeatHold>,
    @InjectRepository(ShowtimeSeat)
    private showtimeSeatRepository: Repository<ShowtimeSeat>,
    private dataSource: DataSource,
  ) {}

  async holdSingleSeat(userId: number, dto: HoldSeatDto): Promise<HoldResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { showtimeSeatId, holdMinutes = 5 } = dto;

      const showtimeSeat = await queryRunner.manager.findOne(ShowtimeSeat, {
        where: { showtime_seat_id: showtimeSeatId },
        relations: ['showtime', 'seat'],
      });

      if (!showtimeSeat) {
        throw new NotFoundException('Ghế không tồn tại');
      }

      if (showtimeSeat.status !== 'AVAILABLE') {
        throw new BadRequestException('Ghế không còn trống');
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      await queryRunner.manager.update(ShowtimeSeat, showtimeSeatId, {
        status: 'HELD',
        held_by_user_id: userId,
        hold_expires_at: expiresAt,
      });

      const holdToken = `HOLD-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const hold = this.seatHoldRepository.create({
        user_id: userId,
        showtime_seat_id: showtimeSeatId,
        hold_token: holdToken,
        expired_at: expiresAt,
        status: 'ACTIVE',
      });

      const savedHold = await queryRunner.manager.save(SeatHold, hold);

      await queryRunner.commitTransaction();

      return {
        holdId: savedHold.hold_id,
        holdToken: savedHold.hold_token,
        expiredAt: savedHold.expired_at,
        status: savedHold.status,
        showtimeSeatId,
        seatLabel: `${showtimeSeat.seat.seat_row}${showtimeSeat.seat.seat_number}`,
        price: Number(showtimeSeat.price),
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
        where: showtimeSeatIds.map((id) => ({ showtime_seat_id: id })),
        relations: ['showtime', 'seat'],
      });

      if (showtimeSeats.length !== showtimeSeatIds.length) {
        throw new NotFoundException('Một hoặc nhiều ghế không tồn tại');
      }

      const showtimeId = showtimeSeats[0].showtime_id;
      const sameShowtime = showtimeSeats.every((s) => s.showtime_id === showtimeId);

      if (!sameShowtime) {
        throw new BadRequestException('Tất cả ghế phải thuộc cùng một suất chiếu');
      }

      const notAvailable = showtimeSeats.filter((s) => s.status !== 'AVAILABLE');
      if (notAvailable.length > 0) {
        throw new BadRequestException(
          `Các ghế không còn trống: ${notAvailable
            .map((s) => `${s.seat.seat_row}${s.seat.seat_number}`)
            .join(', ')}`,
        );
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      const responses: HoldResponseDto[] = [];

      for (const showtimeSeat of showtimeSeats) {
        await queryRunner.manager.update(ShowtimeSeat, showtimeSeat.showtime_seat_id, {
          status: 'HELD',
          held_by_user_id: userId,
          hold_expires_at: expiresAt,
        });

        const holdToken = `HOLD-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const hold = this.seatHoldRepository.create({
          user_id: userId,
          showtime_seat_id: showtimeSeat.showtime_seat_id,
          hold_token: holdToken,
          expired_at: expiresAt,
          status: 'ACTIVE',
        });

        const savedHold = await queryRunner.manager.save(SeatHold, hold);

        responses.push({
          holdId: savedHold.hold_id,
          holdToken: savedHold.hold_token,
          expiredAt: savedHold.expired_at,
          status: savedHold.status,
          showtimeSeatId: showtimeSeat.showtime_seat_id,
          seatLabel: `${showtimeSeat.seat.seat_row}${showtimeSeat.seat.seat_number}`,
          price: Number(showtimeSeat.price),
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

  async releaseHold(holdId: number, userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hold = await queryRunner.manager.findOne(SeatHold, {
        where: { hold_id: holdId, user_id: userId },
      });

      if (!hold) {
        throw new NotFoundException('Không tìm thấy hold hoặc không thuộc về bạn');
      }

      if (hold.status !== 'ACTIVE') {
        throw new BadRequestException('Hold đã được xử lý');
      }

      await queryRunner.manager.update(SeatHold, holdId, { status: 'CANCELLED' });

      await queryRunner.manager.update(ShowtimeSeat, hold.showtime_seat_id, {
        status: 'AVAILABLE',
        held_by_user_id: null,
        hold_expires_at: null,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserHolds(userId: number): Promise<HoldResponseDto[]> {
    const holds = await this.seatHoldRepository.find({
      where: { user_id: userId, status: 'ACTIVE' },
      relations: [
        'showtime_seat',
        'showtime_seat.seat',
        'showtime_seat.showtime',
        'showtime_seat.showtime.movie',
        'showtime_seat.showtime.room',
        'showtime_seat.showtime.room.cinema',
      ],
      order: { created_at: 'DESC' },
    });

    return holds.map((hold) => ({
      holdId: hold.hold_id,
      holdToken: hold.hold_token,
      expiredAt: hold.expired_at,
      status: hold.status,
      showtimeSeatId: hold.showtime_seat.showtime_seat_id,
      seatLabel: `${hold.showtime_seat.seat.seat_row}${hold.showtime_seat.seat.seat_number}`,
      price: Number(hold.showtime_seat.price),
      showtimeInfo: {
        movieTitle: hold.showtime_seat.showtime.movie.title,
        startTime: hold.showtime_seat.showtime.start_time,
        cinemaName: hold.showtime_seat.showtime.room?.cinema?.cinema_name,
      },
    }));
  }

  async getHoldDetails(holdId: number, userId: number): Promise<HoldResponseDto> {
    const hold = await this.seatHoldRepository.findOne({
      where: { hold_id: holdId, user_id: userId },
      relations: [
        'showtime_seat',
        'showtime_seat.seat',
        'showtime_seat.showtime',
        'showtime_seat.showtime.movie',
        'showtime_seat.showtime.room',
        'showtime_seat.showtime.room.cinema',
      ],
    });

    if (!hold) {
      throw new NotFoundException('Không tìm thấy hold');
    }

    return {
      holdId: hold.hold_id,
      holdToken: hold.hold_token,
      expiredAt: hold.expired_at,
      status: hold.status,
      showtimeSeatId: hold.showtime_seat.showtime_seat_id,
      seatLabel: `${hold.showtime_seat.seat.seat_row}${hold.showtime_seat.seat.seat_number}`,
      price: Number(hold.showtime_seat.price),
      showtimeInfo: {
        movieTitle: hold.showtime_seat.showtime.movie.title,
        startTime: hold.showtime_seat.showtime.start_time,
        cinemaName: hold.showtime_seat.showtime.room?.cinema?.cinema_name,
      },
    };
  }
}
