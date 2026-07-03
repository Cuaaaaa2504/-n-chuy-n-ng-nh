import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { SeatHoldService } from './seat-hold/seat-hold.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';

@Injectable()
export class ShowtimeSeatsService {
  constructor(
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    private readonly seatHoldService: SeatHoldService,
    private readonly dataSource: DataSource,
  ) {}

  async getHello() {
    return { message: 'showtime-seats module ok' };
  }

  async getSeatMap(showtimeId: number) {
    const seats = await this.showtimeSeatRepository.find({
      where: { showtime_id: showtimeId },
      relations: [
        'seat',
        'seat.seat_type',
        'showtime',
        'showtime.movie',
        'showtime.room',
        'showtime.room.cinema',
        'held_by_user',
      ],
      order: {
        seat: {
          seat_row: 'ASC',
          seat_number: 'ASC',
        },
      },
    });

    if (!seats.length) {
      throw new NotFoundException(
        'Không tìm thấy sơ đồ ghế cho suất chiếu này',
      );
    }

    const first = seats[0];

    return {
      showtimeId,
      movieTitle: first.showtime?.movie?.title ?? null,
      cinemaName: first.showtime?.room?.cinema?.cinema_name ?? null,
      roomName: first.showtime?.room?.room_name ?? null,
      startTime: first.showtime?.start_time ?? null,
      endTime: first.showtime?.end_time ?? null,
      seats: seats.map((item) => ({
        showtimeSeatId: item.showtime_seat_id,
        showtimeId: item.showtime_id,
        seatId: item.seat_id,
        seatRow: item.seat?.seat_row ?? null,
        seatNumber: item.seat?.seat_number ?? null,
        seatLabel: item.seat?.seat_label ?? null,
        seatTypeId: item.seat?.seat_type_id ?? null,
        seatTypeCode: item.seat?.seat_type?.type_code ?? null,
        seatTypeName: item.seat?.seat_type?.type_name ?? null,
        seatStatus: item.status,
        price: Number(item.price),
        heldByUserId: item.held_by_user_id,
        holdExpiresAt: item.hold_expires_at,
      })),
    };
  }

  async holdSeat(userId: number, dto: HoldSeatDto) {
    return this.seatHoldService.holdSingleSeat(userId, dto);
  }

  async holdManySeats(userId: number, dto: HoldManySeatsDto) {
    return this.seatHoldService.holdMultipleSeats(userId, {
      showtimeSeatIds: dto.showtimeSeatIds,
      holdMinutes: dto.holdMinutes,
    });
  }

  async getMyHolds(userId: number) {
    return this.seatHoldService.getUserHolds(userId);
  }

  async getHoldDetails(userId: number, holdId: number) {
    return this.seatHoldService.getHoldDetails(holdId, userId);
  }

  async releaseHold(userId: number, holdId: number) {
    await this.seatHoldService.releaseHold(holdId, userId);
    return {
      message: 'Release hold thành công',
      holdId,
    };
  }

  async expireSeatHolds() {
    try {
      await this.dataSource.query(`
        EXEC sp_release_expired_holds
      `);

      return { message: 'Expired seat holds released' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Không thể giải phóng ghế giữ hết hạn',
      );
    }
  }
}
