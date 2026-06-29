import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { BookingService } from '../booking/booking.service';
import { CreatePaymentDto, PaymentResponse } from './dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,

    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,

    @InjectRepository(BookingDetail)
    private bookingDetailRepository: Repository<BookingDetail>,

    @InjectRepository(ShowtimeSeat)
    private showtimeSeatRepository: Repository<ShowtimeSeat>,

    private bookingService: BookingService,
    private dataSource: DataSource,
  ) {}

  async createPayment(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const booking = await this.bookingService.validateBookingForPayment(
      dto.bookingId,
      userId,
    );

    const existingPendingPayment = await this.paymentRepository.findOne({
      where: {
        booking_id: dto.bookingId,
        payment_status: 'PENDING',
      },
    });

    if (existingPendingPayment) {
      throw new BadRequestException('Booking đã có payment đang chờ xử lý');
    }

    const transactionCode = this.generatePaymentCode();

    const payment = this.paymentRepository.create({
      booking_id: booking.booking_id,
      payment_method: dto.paymentMethod,
      amount: booking.final_amount,
      transaction_code: transactionCode,
      payment_status: 'PENDING',
      payment_url: null,
      provider_response: null,
      failed_reason: null,
      paid_at: null,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      paymentId: savedPayment.payment_id,
      bookingId: savedPayment.booking_id,
      amount: Number(savedPayment.amount),
      paymentMethod: savedPayment.payment_method,
      paymentStatus: savedPayment.payment_status,
      transactionCode: savedPayment.transaction_code,
      paymentUrl: savedPayment.payment_url,
      createdAt: savedPayment.created_at,
    };
  }

  async processPaymentSuccess(paymentId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { payment_id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException('Không tìm thấy payment');
      }

      if (payment.payment_status !== 'PENDING') {
        throw new BadRequestException(
          `Payment status is ${payment.payment_status}, only PENDING can be processed`,
        );
      }

      const booking = await this.bookingService.validateBookingForPayment(
        payment.booking_id,
      );

      const bookingDetails = await queryRunner.manager.find(BookingDetail, {
        where: { booking_id: booking.booking_id },
        relations: ['showtime_seat', 'showtime_seat.seat'],
      });

      if (!bookingDetails.length) {
        throw new BadRequestException('Không tìm thấy ghế trong booking');
      }

      await queryRunner.manager.update(Payment, payment.payment_id, {
        payment_status: 'SUCCESS',
        paid_at: new Date(),
      });

      for (const detail of bookingDetails) {
        await queryRunner.manager.update(ShowtimeSeat, detail.showtime_seat_id, {
          status: 'SOLD',
          hold_expires_at: null,
          held_by_user_id: null,
        });
      }

      await this.bookingService.updateBookingToPaid(booking.booking_id);

      const tickets: any[] = [];

      for (const detail of bookingDetails) {
        const existingTicket = await queryRunner.manager.findOne(Ticket, {
          where: { booking_detail_id: detail.booking_detail_id },
        });

        if (existingTicket) {
          tickets.push({
            ticketId: existingTicket.ticket_id,
            ticketCode: existingTicket.ticket_code,
            qrCode: existingTicket.qr_code,
            seatLabel: detail.showtime_seat?.seat
              ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
              : null,
            seatType: detail.showtime_seat?.seat?.seat_type ?? null,
            price: Number(detail.seat_price),
          });
          continue;
        }

        const ticket = queryRunner.manager.create(Ticket, {
          booking_detail_id: detail.booking_detail_id,
          ticket_code: this.generateTicketCode(),
          qr_code: this.generateQrCode(),
          ticket_status: 'VALID',
        });

        const savedTicket = await queryRunner.manager.save(Ticket, ticket);

        tickets.push({
          ticketId: savedTicket.ticket_id,
          ticketCode: savedTicket.ticket_code,
          qrCode: savedTicket.qr_code,
          seatLabel: detail.showtime_seat?.seat
            ? `${detail.showtime_seat.seat.seat_row}${detail.showtime_seat.seat.seat_number}`
            : null,
          seatType: detail.showtime_seat?.seat?.seat_type ?? null,
          price: Number(detail.seat_price),
        });
      }

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
    const payment = await this.paymentRepository.findOne({
      where: { payment_id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy payment');
    }

    if (payment.payment_status !== 'PENDING') {
      throw new BadRequestException(
        `Payment status is ${payment.payment_status}, only PENDING can be failed`,
      );
    }

    await this.paymentRepository.update(paymentId, {
      payment_status: 'FAILED',
      failed_reason: reason || 'Payment failed',
    });

    await this.bookingService.updateBookingToFailed(payment.booking_id);

    return {
      message: 'Payment failed',
      bookingStatus: 'FAILED',
    };
  }

  async getPaymentByBookingId(bookingId: number): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { booking_id: bookingId },
      order: { payment_id: 'DESC' },
    });
  }

  private generatePaymentCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = uuidv4().slice(0, 6).toUpperCase();
    return `PAY-${dateStr}-${randomStr}`;
  }

  private generateTicketCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = uuidv4().slice(0, 6).toUpperCase();
    return `TICKET-${dateStr}-${randomStr}`;
  }

  private generateQrCode(): string {
    return `QR-${Date.now()}-${uuidv4().slice(0, 8)}`;
  }
}
