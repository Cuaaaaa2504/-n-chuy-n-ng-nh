// src/modules/bookings/bookings.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { BookingOrder } from '../../database/entities/booking-order.entity';

@Injectable()
export class BookingsService {
  constructor(
    private bookingsRepository: BookingsRepository,
    private showtimesService: ShowtimesService,
  ) {}

  async validateBookingForPayment(bookingId: number): Promise<BookingOrder> {
    const booking = await this.bookingsRepository.findBookingWithDetails(bookingId);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Booking status is ${booking.status}, only PENDING_PAYMENT can be paid`,
      );
    }

    if (booking.expired_at && new Date() > booking.expired_at) {
      throw new BadRequestException('Booking has expired');
    }

    return booking;
  }

  async updateBookingToPaid(bookingId: number): Promise<void> {
    await this.bookingsRepository.updateBookingStatus(bookingId, 'PAID');
  }

  async updateBookingToIssued(bookingId: number): Promise<void> {
    await this.bookingsRepository.updateBookingStatus(bookingId, 'ISSUED');
  }

  async updateBookingToFailed(bookingId: number): Promise<void> {
    await this.bookingsRepository.updateBookingStatus(bookingId, 'FAILED');
  }

  async getBookingSeatIds(bookingId: number): Promise<number[]> {
    return this.bookingsRepository.getBookingSeatIds(bookingId);
  }
}