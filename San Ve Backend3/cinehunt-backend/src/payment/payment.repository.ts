import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { BookingDetail } from '../entities/booking-detail.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(BookingDetail)
    private readonly bookingDetailRepo: Repository<BookingDetail>,
  ) {}

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepo.create(data);
    return this.paymentRepo.save(payment);
  }

  async findPaymentById(paymentId: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { payment_id: paymentId },
    });
  }

  async findPendingByBookingId(bookingId: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { booking_id: bookingId, payment_status: 'PENDING' },
    });
  }

  async findLatestByBookingId(bookingId: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { booking_id: bookingId },
      order: { payment_id: 'DESC' },
    });
  }

  async updatePaymentStatus(
    paymentId: number,
    status: string,
    paidAt?: Date,
  ): Promise<void> {
    const data: Partial<Payment> = { payment_status: status } as any;
    if (paidAt) {
      (data as any).paid_at = paidAt;
    }
    await this.paymentRepo.update(paymentId, data);
  }

  async updatePaymentFailed(paymentId: number, reason: string): Promise<void> {
    await this.paymentRepo.update(paymentId, {
      payment_status: 'FAILED',
      failed_reason: reason,
    } as any);
  }

  async getBookingDetailsByBookingId(
    bookingId: number,
  ): Promise<BookingDetail[]> {
    return this.bookingDetailRepo.find({
      where: { booking_id: bookingId },
      relations: ['showtime_seat', 'showtime_seat.seat', 'showtime_seat.showtime', 'showtime_seat.showtime.movie', 'showtime_seat.showtime.room', 'showtime_seat.showtime.room.cinema'],
    });
  }

  async findTicketByDetailId(
    bookingDetailId: number,
  ): Promise<Ticket | null> {
    return this.ticketRepo.findOne({
      where: { booking_detail_id: bookingDetailId },
    });
  }

  async createTicket(data: Partial<Ticket>): Promise<Ticket> {
    const ticket = this.ticketRepo.create(data);
    return this.ticketRepo.save(ticket);
  }

  generatePaymentCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PAY-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
  }

  generateTicketCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TICKET-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
  }

  generateQrCode(): string {
    return `QR-${Date.now()}-${uuidv4().slice(0, 8)}`;
  }
}
