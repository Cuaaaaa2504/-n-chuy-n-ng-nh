import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHoldService } from './seat-hold/seat-hold.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';

@Injectable()
export class ShowtimeSeatsService {
  constructor(
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
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
      movieTitle: first.showtime?.movie?.title,
      cinemaName: first.showtime?.room?.cinema?.cinema_name,
      roomName: first.showtime?.room?.room_name,
      startTime: first.showtime?.start_time,
      endTime: first.showtime?.end_time,
      seats: seats.map((item) => ({
        showtimeSeatId: item.showtime_seat_id,
        showtimeId: item.showtime_id,
        seatId: item.seat_id,
        seatRow: item.seat?.seat_row,
        seatNumber: item.seat?.seat_number,
        seatType: item.seat?.seat_type,
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
    return { message: 'Release hold thành công', holdId };
  }

  async expireSeatHolds() {
    try {
      await this.dataSource.query(`EXEC sp_expire_seat_holds`);
      return { message: 'expired holds released ok' };
    } catch {
      throw new InternalServerErrorException(
        'Không thể xử lý expire seat holds.',
      );
    }
  }

  // ✅ THÊM MỚI — bulk update nhiều ghế → SOLD
  async updateSeatsToSold(showtimeSeatIds: number[]): Promise<void> {
    if (!showtimeSeatIds.length) return;

    await this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: 'SOLD',
        hold_expires_at: null,
        held_by_user_id: null,
      })
      .where('showtime_seat_id IN (:...ids)', { ids: showtimeSeatIds })
      .execute();
  }
}
