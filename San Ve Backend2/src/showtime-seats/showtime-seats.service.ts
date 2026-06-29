import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';

@Injectable()
export class ShowtimeSeatsService {
  constructor(private readonly dataSource: DataSource) {}

  async getHello() {
    return {
      message: 'showtime-seats module ok',
    };
  }

  async getSeatMap(showtimeId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        showtime_seat_id,
        showtime_id,
        movie_title,
        cinema_name,
        room_name,
        seat_row,
        seat_number,
        seat_type,
        seat_status,
        price,
        held_by_user_id,
        hold_expires_at,
        start_time,
        end_time
      FROM vw_showtime_seat_map
      WHERE showtime_id = @0
      ORDER BY seat_row, seat_number
      `,
      [showtimeId],
    );

    return {
      showtimeId,
      seats: rows,
    };
  }

  async holdSeat(dto: HoldSeatDto) {
    try {
      const result = await this.dataSource.query(
        `
        EXEC sp_hold_seat
          @user_id = @0,
          @showtime_seat_id = @1,
          @hold_minutes = @2
        `,
        [dto.userId, dto.showtimeSeatId, dto.holdMinutes],
      );

      return {
        message: 'hold 1 seat ok',
        data: result,
      };
    } catch (error) {
      this.handleSeatError(error);
    }
  }

  async holdManySeats(dto: HoldManySeatsDto) {
    try {
      const seatIds = dto.showtimeSeatIds.join(',');

      const result = await this.dataSource.query(
        `
        EXEC sp_hold_seats
          @user_id = @0,
          @showtime_seat_ids = @1,
          @hold_minutes = @2
        `,
        [dto.userId, seatIds, dto.holdMinutes],
      );

      return {
        message: 'hold many seats ok',
        data: result,
      };
    } catch (error) {
      this.handleSeatError(error);
    }
  }

  async expireSeatHolds() {
    try {
      await this.dataSource.query(`
        EXEC sp_expire_seat_holds
      `);

      return {
        message: 'expired holds released ok',
      };
    } catch {
      throw new InternalServerErrorException('Không thể xử lý expire seat holds.');
    }
  }

  private handleSeatError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const dbMessage =
        (error as any)?.driverError?.originalError?.info?.message ||
        (error as any)?.driverError?.message ||
        error.message ||
        '';

      if (dbMessage.includes('Ghế không còn trống')) {
        throw new ConflictException('Ghế này hiện không còn trống.');
      }

      if (dbMessage.includes('Một hoặc nhiều ghế không còn trống')) {
        throw new ConflictException('Một hoặc nhiều ghế bạn chọn đã không còn trống.');
      }

      if (dbMessage.includes('Các ghế cần giữ phải thuộc cùng một suất chiếu')) {
        throw new ConflictException('Các ghế cần giữ phải thuộc cùng một suất chiếu.');
      }

      if (dbMessage.includes('Người dùng không tồn tại hoặc bị khóa')) {
        throw new ConflictException('Người dùng không tồn tại hoặc đã bị khóa.');
      }
    }

    throw new InternalServerErrorException('Có lỗi xảy ra khi giữ ghế.');
  }
}
