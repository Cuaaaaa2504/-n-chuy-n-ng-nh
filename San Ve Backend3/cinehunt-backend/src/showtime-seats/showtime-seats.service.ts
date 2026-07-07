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
    // FIX: 'heldByUser' không phải là @ManyToOne relation trong ShowtimeSeat entity
    // (entity chỉ có cột heldByUserId kiểu int, không có relation đến User)
    // Xóa nó khỏi relations[] để tránh EntityPropertyNotFoundError 500.
    const seats = await this.showtimeSeatRepository.find({
      where: { showtimeId },
      relations: [
        'seat',
        'seat.seatType',
        'showtime',
        'showtime.movie',
        'showtime.room',
        'showtime.room.cinema',
        // 'heldByUser' — đã xóa: không có @ManyToOne User trong entity
      ],
      order: {
        seat: {
          seatRow: 'ASC',
          seatNumber: 'ASC',
        },
      },
    });

    if (!seats.length) {
      throw new NotFoundException('Không tìm thấy sơ đồ ghế cho suất chiếu này');
    }

    const first = seats[0];

    return {
      showtimeId,
      movieTitle: first.showtime?.movie?.title ?? null,
      cinemaName: first.showtime?.room?.cinema?.cinemaName ?? null,
      roomName: first.showtime?.room?.roomName ?? null,
      startTime: first.showtime?.startTime ?? null,
      endTime: first.showtime?.endTime ?? null,
      seats: seats.map((item) => ({
        showtimeSeatId: item.showtimeSeatId,
        showtimeId: item.showtimeId,
        seatId: item.seatId,
        seatRow: item.seat?.seatRow ?? null,
        seatNumber: item.seat?.seatNumber ?? null,
        seatLabel: item.seat?.seatLabel ?? null,
        seatTypeId: item.seat?.seatTypeId ?? null,
        seatTypeCode: item.seat?.seatType?.typeCode ?? null,
        seatTypeName: item.seat?.seatType?.typeName ?? null,
        seatStatus: item.status,
        price: Number(item.price),
        heldByUserId: item.heldByUserId,   // vẫn trả về userId số bình thường
        holdExpiresAt: item.holdExpiresAt,
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
      await this.dataSource.query(`EXEC sp_release_expired_holds`);
      return { message: 'Expired seat holds released' };
    } catch (error) {
      throw new InternalServerErrorException('Không thể giải phóng ghế giữ hết hạn');
    }
  }
}
