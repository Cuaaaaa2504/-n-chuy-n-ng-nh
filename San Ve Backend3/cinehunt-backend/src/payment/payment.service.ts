import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Payment } from '../entities/payment.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { BookingService } from '../booking/booking.service';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto, PaymentResponse } from './dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly dataSource: DataSource,
  ) {}

  async createPayment(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const booking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
    );

    const existingPending =
      await this.paymentRepository.findPendingByBookingId(dto.bookingId);
    if (existingPending) {
      throw new BadRequestException('Booking đã có payment đang chờ xử lý');
    }

    const transactionCode = this.paymentRepository.generatePaymentCode();

    const payment = await this.paymentRepository.createPayment({
      booking_id: booking.booking_id,
      payment_method: dto.paymentMethod,
      amount: booking.final_amount,
      transaction_code: transactionCode,
      payment_status: 'PENDING',
      payment_url: null,
      provider_response: null,
      failed_reason: null,
      paid_at: null,
    } as any);

    return {
      paymentId: payment.payment_id,
      bookingId: payment.booking_id,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      paymentStatus: payment.payment_status,
      transactionCode: payment.transaction_code,
      paymentUrl: payment.payment_url,
      createdAt: payment.created_at,
    };
  }

  async processPaymentSuccess(paymentId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lấy payment
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { payment_id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException('Không tìm thấy payment');
      }
      if (payment.payment_status !== 'PENDING') {
        throw new BadRequestException(
          `Payment status là ${payment.payment_status}, chỉ PENDING mới được xử lý`,
        );
      }

      // 2. Validate booking
      const booking = await this.bookingService.validateBookingForPayment(
        payment.booking_id,
      );

      // 3. Lấy booking details
      const bookingDetails =
        await this.paymentRepository.getBookingDetailsByBookingId(
          payment.booking_id,
        );
      if (!bookingDetails.length) {
        throw new BadRequestException('Không tìm thấy ghế trong booking');
      }

      // 4. Update payment → SUCCESS
      await queryRunner.manager.update(Payment, paymentId, {
        payment_status: 'SUCCESS',
        paid_at: new Date(),
      });

      // 5. Bulk update tất cả ghế → SOLD (thay vì loop từng cái)
      const seatIds = bookingDetails.map((d) => d.showtime_seat_id);
      await queryRunner.manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({
          status: 'SOLD',
          hold_expires_at: null,
          held_by_user_id: null,
        })
        .where('showtime_seat_id IN (:...ids)', { ids: seatIds })
        .execute();

      // 6. Update booking → PAID
      await this.bookingService.updateBookingToPaid(booking.booking_id);

      // 7. Tạo tickets
      const tickets: any[] = [];
      for (const detail of bookingDetails) {
        const existing = await this.paymentRepository.findTicketByDetailId(
          detail.booking_detail_id,
        );

        if (existing) {
          tickets.push({
            ticketId: existing.ticket_id,
            ticketCode: existing.ticket_code,
            qrCode: existing.qr_code,
            seatLabel: detail.showtime_seat?.seat
              ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
              : null,
            seatType: detail.showtime_seat?.seat?.seat_type ?? null,
            price: Number(detail.seat_price),
          });
          continue;
        }

        const newTicket = await this.paymentRepository.createTicket({
          booking_detail_id: detail.booking_detail_id,
          ticket_code: this.paymentRepository.generateTicketCode(),
          qr_code: this.paymentRepository.generateQrCode(),
          ticket_status: 'VALID',
        } as any);

        tickets.push({
          ticketId: newTicket.ticket_id,
          ticketCode: newTicket.ticket_code,
          qrCode: newTicket.qr_code,
          seatLabel: detail.showtime_seat?.seat
            ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
            : null,
          seatType: detail.showtime_seat?.seat?.seat_type ?? null,
          price: Number(detail.seat_price),
        });
      }

      // 8. Update booking → ISSUED
      await this.bookingService.updateBookingToIssued(booking.booking_id);

      await queryRunner.commitTransaction();

      return {
        message: 'Payment successful',
        bookingStatus: 'ISSUED',
        ticketCount: tickets.length,
        tickets,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processPaymentFailed(paymentId: number, reason?: string) {
    const payment =
      await this.paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Không tìm thấy payment');
    }
    if (payment.payment_status !== 'PENDING') {
      throw new BadRequestException(
        `Payment status là ${payment.payment_status}, chỉ PENDING mới được đổi thành FAILED`,
      );
    }

    await this.paymentRepository.updatePaymentFailed(
      paymentId,
      reason || 'Payment failed',
    );
    await this.bookingService.updateBookingToFailed(payment.booking_id);

    return { message: 'Payment failed', bookingStatus: 'FAILED' };
  }

  async getPaymentByBookingId(bookingId: number): Promise<Payment | null> {
    return this.paymentRepository.findLatestByBookingId(bookingId);
  }
}
