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

  async holdSingleSeat(
    userId: number,
    dto: HoldSeatDto,
  ): Promise<HoldResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { showtimeSeatId, holdMinutes = 5 } = dto;

      const showtimeSeat = await queryRunner.manager.findOne(ShowtimeSeat, {
        where: { showtime_seat_id: showtimeSeatId },
        relations: [
          'showtime',
          'showtime.movie',
          'showtime.room',
          'showtime.room.cinema',
          'seat',
        ],
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

      const hold = this.seatHoldRepository.create({
        user_id: userId,
        showtime_seat_id: showtimeSeatId,
        hold_token: crypto.randomUUID(),
        expires_at: expiresAt,
        status: 'ACTIVE',
      });

      const savedHold = await queryRunner.manager.save(SeatHold, hold);

      await queryRunner.commitTransaction();

      return {
        holdId: savedHold.hold_id,
        holdToken: savedHold.hold_token,
        expiresAt: savedHold.expires_at,
        status: savedHold.status,
        showtimeSeatId,
        seatLabel: showtimeSeat.seat?.seat_label ??
          `${showtimeSeat.seat?.seat_row ?? ''}${showtimeSeat.seat?.seat_number ?? ''}`,
        price: Number(showtimeSeat.price),
        showtimeInfo: {
          movieTitle: showtimeSeat.showtime?.movie?.title ?? '',
          startTime: showtimeSeat.showtime?.start_time,
          cinemaName: showtimeSeat.showtime?.room?.cinema?.cinema_name,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async holdMultipleSeats(
    userId: number,
    dto: HoldSeatsDto,
  ): Promise<HoldResponseDto[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { showtimeSeatIds, holdMinutes = 5 } = dto;

      if (!showtimeSeatIds || showtimeSeatIds.length === 0) {
        throw new BadRequestException('Danh sách ghế không hợp lệ');
      }

      const showtimeSeats = await queryRunner.manager.find(ShowtimeSeat, {
        where: {
          showtime_seat_id: In(showtimeSeatIds),
        },
        relations: [
          'showtime',
          'showtime.movie',
          'showtime.room',
          'showtime.room.cinema',
          'seat',
        ],
      });

      if (showtimeSeats.length !== showtimeSeatIds.length) {
        throw new NotFoundException('Một hoặc nhiều ghế không tồn tại');
      }

      const showtimeId = showtimeSeats[0].showtime_id;
      const sameShowtime = showtimeSeats.every(
        (seat) => seat.showtime_id === showtimeId,
      );

      if (!sameShowtime) {
        throw new BadRequestException(
          'Tất cả ghế phải thuộc cùng một suất chiếu',
        );
      }

      const notAvailable = showtimeSeats.filter(
        (seat) => seat.status !== 'AVAILABLE',
      );

      if (notAvailable.length > 0) {
        throw new BadRequestException(
          `Các ghế không còn trống: ${notAvailable
            .map(
              (seat) =>
                seat.seat?.seat_label ??
                `${seat.seat?.seat_row ?? ''}${seat.seat?.seat_number ?? ''}`,
            )
            .join(', ')}`,
        );
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      const responses: HoldResponseDto[] = [];

      for (const showtimeSeat of showtimeSeats) {
        await queryRunner.manager.update(
          ShowtimeSeat,
          showtimeSeat.showtime_seat_id,
          {
            status: 'HELD',
            held_by_user_id: userId,
            hold_expires_at: expiresAt,
          },
        );

        const hold = this.seatHoldRepository.create({
          user_id: userId,
          showtime_seat_id: showtimeSeat.showtime_seat_id,
          hold_token: crypto.randomUUID(),
          expires_at: expiresAt,
          status: 'ACTIVE',
        });

        const savedHold = await queryRunner.manager.save(SeatHold, hold);

        responses.push({
          holdId: savedHold.hold_id,
          holdToken: savedHold.hold_token,
          expiresAt: savedHold.expires_at,
          status: savedHold.status,
          showtimeSeatId: showtimeSeat.showtime_seat_id,
          seatLabel:
            showtimeSeat.seat?.seat_label ??
            `${showtimeSeat.seat?.seat_row ?? ''}${showtimeSeat.seat?.seat_number ?? ''}`,
          price: Number(showtimeSeat.price),
          showtimeInfo: {
            movieTitle: showtimeSeat.showtime?.movie?.title ?? '',
            startTime: showtimeSeat.showtime?.start_time,
            cinemaName: showtimeSeat.showtime?.room?.cinema?.cinema_name,
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
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      relations: [
        'showtime_seat',
        'showtime_seat.seat',
        'showtime_seat.showtime',
        'showtime_seat.showtime.movie',
        'showtime_seat.showtime.room',
        'showtime_seat.showtime.room.cinema',
      ],
      order: {
        created_at: 'DESC',
      },
    });

    return holds.map((hold) => ({
      holdId: hold.hold_id,
      holdToken: hold.hold_token,
      expiresAt: hold.expires_at,
      status: hold.status,
      showtimeSeatId: hold.showtime_seat?.showtime_seat_id,
      seatLabel:
        hold.showtime_seat?.seat?.seat_label ??
        `${hold.showtime_seat?.seat?.seat_row ?? ''}${hold.showtime_seat?.seat?.seat_number ?? ''}`,
      price: hold.showtime_seat ? Number(hold.showtime_seat.price) : 0,
      showtimeInfo: hold.showtime_seat?.showtime
        ? {
            movieTitle: hold.showtime_seat.showtime.movie?.title ?? '',
            startTime: hold.showtime_seat.showtime.start_time,
            cinemaName:
              hold.showtime_seat.showtime.room?.cinema?.cinema_name,
          }
        : undefined,
    }));
  }

  async getHoldDetails(holdId: number, userId: number) {
    const hold = await this.seatHoldRepository.findOne({
      where: {
        hold_id: String(holdId),
        user_id: userId,
      },
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
      throw new NotFoundException('Không tìm thấy thông tin hold');
    }

    return {
      holdId: hold.hold_id,
      holdToken: hold.hold_token,
      expiresAt: hold.expires_at,
      releasedAt: hold.released_at,
      status: hold.status,
      showtimeSeatId: hold.showtime_seat?.showtime_seat_id,
      seatLabel:
        hold.showtime_seat?.seat?.seat_label ??
        `${hold.showtime_seat?.seat?.seat_row ?? ''}${hold.showtime_seat?.seat?.seat_number ?? ''}`,
      price: hold.showtime_seat ? Number(hold.showtime_seat.price) : 0,
      showtimeInfo: hold.showtime_seat?.showtime
        ? {
            movieTitle: hold.showtime_seat.showtime.movie?.title ?? '',
            startTime: hold.showtime_seat.showtime.start_time,
            cinemaName:
              hold.showtime_seat.showtime.room?.cinema?.cinema_name,
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
        where: {
          hold_id: String(holdId),
          user_id: userId,
          status: 'ACTIVE',
        },
      });

      if (!hold) {
        throw new NotFoundException('Không tìm thấy hold hợp lệ');
      }

      await queryRunner.manager.update(
        SeatHold,
        { hold_id: String(holdId) },
        {
          status: 'CANCELLED',
          released_at: new Date(),
        },
      );

      await queryRunner.manager.update(
        ShowtimeSeat,
        { showtime_seat_id: hold.showtime_seat_id },
        {
          status: 'AVAILABLE',
          held_by_user_id: null,
          hold_expires_at: null,
        },
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        holdId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
