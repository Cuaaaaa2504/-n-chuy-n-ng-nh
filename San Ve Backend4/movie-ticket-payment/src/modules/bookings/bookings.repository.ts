// src/modules/bookings/bookings.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingOrder } from '../../database/entities/booking-order.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';

@Injectable()
export class BookingsRepository {
  constructor(
    @InjectRepository(BookingOrder)
    private bookingOrderRepository: Repository<BookingOrder>,
    @InjectRepository(BookingDetail)
    private bookingDetailRepository: Repository<BookingDetail>,
  ) {}

  async findBookingById(bookingId: number): Promise<BookingOrder | null> {
    return this.bookingOrderRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['user', 'showtime'],
    });
  }

  async findBookingWithDetails(bookingId: number): Promise<BookingOrder | null> {
    return this.bookingOrderRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['bookingDetails', 'bookingDetails.showtimeSeat'],
    });
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<void> {
    await this.bookingOrderRepository.update(bookingId, { status });
  }

  async getBookingSeatIds(bookingId: number): Promise<number[]> {
    const details = await this.bookingDetailRepository.find({
      where: { booking_id: bookingId },
      select: ['showtime_seat_id'],
    });
    return details.map(d => d.showtime_seat_id);
  }
}