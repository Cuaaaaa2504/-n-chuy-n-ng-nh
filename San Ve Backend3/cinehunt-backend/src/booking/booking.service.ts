import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { CreateBookingRequest, BookingResponse } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(BookingOrder)
    private bookingOrderRepository: Repository<BookingOrder>,
    @InjectRepository(BookingDetail)
    private bookingDetailRepository: Repository<BookingDetail>,
    @InjectRepository(SeatHold)
    private seatHoldRepository: Repository<SeatHold>,
    @InjectRepository(ShowtimeSeat)
    private showtimeSeatRepository: Repository<ShowtimeSeat>,
    private dataSource: DataSource,
  ) {}

  async createBooking(
    userId: number,
    request: CreateBookingRequest,
  ): Promise<BookingResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { holdIds } = request;

      const holds = await queryRunner.manager.find(SeatHold, {
        where: holdIds.map((id) => ({ hold_id: id })),
        relations: ['showtime_seat', 'showtime_seat.showtime', 'user'],
      });

      if (holds.length !== holdIds.length) {
        throw new NotFoundException('Không tìm thấy một hoặc nhiều ghế giữ');
      }

      const now = new Date();

      for (const hold of holds) {
        if (hold.user_id !== userId) {
          throw new ForbiddenException(`Ghế giữ ${hold.hold_id} không thuộc về bạn`);
        }

        if (hold.status !== 'ACTIVE') {
          throw new BadRequestException(`Ghế giữ ${hold.hold_id} không còn hiệu lực`);
        }

        if (new Date(hold.expired_at) < now) {
          throw new BadRequestException(`Ghế giữ ${hold.hold_id} đã hết hạn`);
        }

        const showtimeSeat = await queryRunner.manager.findOne(ShowtimeSeat, {
          where: { showtime_seat_id: hold.showtime_seat_id },
        });

        if (
          !showtimeSeat ||
          showtimeSeat.status !== 'HELD' ||
          showtimeSeat.held_by_user_id !== userId
        ) {
          throw new BadRequestException(
            `Ghế ${hold.hold_id} không còn được giữ hợp lệ`,
          );
        }

        if (
          showtimeSeat.hold_expires_at &&
          new Date(showtimeSeat.hold_expires_at) < now
        ) {
          throw new BadRequestException(`Thời gian giữ ghế ${hold.hold_id} đã hết`);
        }
      }

      const showtimeId = holds[0].showtime_seat.showtime_id;
      const sameShowtime = holds.every(
        (h) => h.showtime_seat.showtime_id === showtimeId,
      );

      if (!sameShowtime) {
        throw new BadRequestException('Tất cả ghế phải thuộc cùng một suất chiếu');
      }

      const totalAmount = holds.reduce((sum, hold) => {
        return sum + Number(hold.showtime_seat.price);
      }, 0);

      const bookingCode = this.generateBookingCode();

      const booking = new BookingOrder();
      booking.user_id = userId;
      booking.showtime_id = showtimeId;
      booking.booking_code = bookingCode;
      booking.total_amount = totalAmount;
      booking.discount_amount = 0;
      booking.final_amount = totalAmount;
      booking.status = 'PENDING_PAYMENT';
      booking.expired_at = new Date(now.getTime() + 10 * 60000);

      const savedBooking = await queryRunner.manager.save(BookingOrder, booking);

      for (const hold of holds) {
        const bookingDetail = new BookingDetail();
        bookingDetail.booking_id = savedBooking.booking_id;
        bookingDetail.showtime_seat_id = hold.showtime_seat_id;
        bookingDetail.seat_price = hold.showtime_seat.price;

        await queryRunner.manager.save(BookingDetail, bookingDetail);

        await queryRunner.manager.update(SeatHold, hold.hold_id, {
          expired_at: booking.expired_at,
        });

        await queryRunner.manager.update(ShowtimeSeat, hold.showtime_seat_id, {
          hold_expires_at: booking.expired_at,
        });
      }

      await queryRunner.commitTransaction();

      return {
        bookingId: savedBooking.booking_id,
        bookingCode: savedBooking.booking_code,
        showtimeId: showtimeId,
        seatCount: holds.length,
        totalAmount: totalAmount,
        discountAmount: 0,
        finalAmount: totalAmount,
        status: savedBooking.status,
        expiredAt: savedBooking.expired_at,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBookingDetail(bookingId: number, userId: number): Promise<any> {
    const booking = await this.bookingOrderRepository.findOne({
      where: { booking_id: bookingId, user_id: userId },
      relations: [
        'showtime',
        'showtime.movie',
        'booking_details',
        'booking_details.showtime_seat',
        'booking_details.showtime_seat.seat',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt vé');
    }

    return booking;
  }

  async validateBookingForPayment(
    bookingId: number,
    userId?: number,
  ): Promise<BookingOrder> {
    const where = userId
      ? { booking_id: bookingId, user_id: userId }
      : { booking_id: bookingId };

    const booking = await this.bookingOrderRepository.findOne({
      where,
      relations: [
        'showtime',
        'showtime.movie',
        'booking_details',
        'booking_details.showtime_seat',
        'booking_details.showtime_seat.seat',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt vé');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Booking status is ${booking.status}, only PENDING_PAYMENT can be paid`,
      );
    }

    if (booking.expired_at && new Date() > new Date(booking.expired_at)) {
      throw new BadRequestException('Booking has expired');
    }

    return booking;
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<void> {
    const result = await this.bookingOrderRepository.update(bookingId, { status });

    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy đơn đặt vé');
    }
  }

  async updateBookingToPaid(bookingId: number): Promise<void> {
    await this.updateBookingStatus(bookingId, 'PAID');
  }

  async updateBookingToIssued(bookingId: number): Promise<void> {
    await this.updateBookingStatus(bookingId, 'ISSUED');
  }

  async updateBookingToFailed(bookingId: number): Promise<void> {
    await this.updateBookingStatus(bookingId, 'FAILED');
  }

  async cancelBooking(bookingId: number, userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(BookingOrder, {
        where: { booking_id: bookingId, user_id: userId },
        relations: ['booking_details'],
      });

      if (!booking) {
        throw new NotFoundException('Không tìm thấy đơn đặt vé');
      }

      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Chỉ có thể hủy đơn ở trạng thái chờ thanh toán');
      }

      await queryRunner.manager.update(BookingOrder, bookingId, {
        status: 'CANCELLED',
      });

      const showtimeSeatIds = booking.booking_details.map(
        (detail) => detail.showtime_seat_id,
      );

      for (const detail of booking.booking_details) {
        await queryRunner.manager.update(ShowtimeSeat, detail.showtime_seat_id, {
          status: 'AVAILABLE',
          held_by_user_id: null,
          hold_expires_at: null,
        });
      }

      if (showtimeSeatIds.length > 0) {
        await queryRunner.manager.update(
          SeatHold,
          {
            user_id: userId,
            showtime_seat_id: In(showtimeSeatIds),
            status: 'ACTIVE',
          },
          {
            status: 'CANCELLED',
          },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async expirePendingBookings(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();

      const expiredBookings = await queryRunner.manager.find(BookingOrder, {
        where: {
          status: 'PENDING_PAYMENT',
        },
        relations: ['booking_details'],
      });

      const toExpire = expiredBookings.filter(
        (b) => b.expired_at && new Date(b.expired_at) < now,
      );

      let expiredCount = 0;

      for (const booking of toExpire) {
        await queryRunner.manager.update(BookingOrder, booking.booking_id, {
          status: 'EXPIRED',
        });

        const showtimeSeatIds = booking.booking_details.map(
          (detail) => detail.showtime_seat_id,
        );

        for (const detail of booking.booking_details) {
          await queryRunner.manager.update(ShowtimeSeat, detail.showtime_seat_id, {
            status: 'AVAILABLE',
            held_by_user_id: null,
            hold_expires_at: null,
          });
        }

        if (showtimeSeatIds.length > 0) {
          await queryRunner.manager.update(
            SeatHold,
            {
              user_id: booking.user_id,
              showtime_seat_id: In(showtimeSeatIds),
              status: 'ACTIVE',
            },
            {
              status: 'EXPIRED',
            },
          );
        }

        expiredCount++;
      }

      await queryRunner.commitTransaction();
      return expiredCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateBookingCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = uuidv4().slice(0, 6).toUpperCase();
    return `BOOK-${dateStr}-${randomStr}`;
  }
}