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

  async findPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { paymentId } });
  }

  async findPendingByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { bookingId, paymentStatus: 'PENDING' },
    });
  }

  async findLatestByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { bookingId },
      order: { paymentId: 'DESC' },
    });
  }

  async updatePaymentStatus(
    paymentId: string,
    status: string,
    paidAt?: Date,
  ): Promise<void> {
    const data: Partial<Payment> = { paymentStatus: status };
    if (paidAt) data.paidAt = paidAt;
    await this.paymentRepo.update({ paymentId }, data);
  }

  async updatePaymentFailed(paymentId: string, reason: string): Promise<void> {
    await this.paymentRepo.update(
      { paymentId },
      { paymentStatus: 'FAILED', providerResponse: reason },
    );
  }

  async getBookingDetailsByBookingId(bookingId: string): Promise<BookingDetail[]> {
    return this.bookingDetailRepo.find({
      where: { bookingId },
      relations: [
        'showtimeSeat',
        'showtimeSeat.seat',
        'showtimeSeat.showtime',
        'showtimeSeat.showtime.movie',
        'showtimeSeat.showtime.room',
        'showtimeSeat.showtime.room.cinema',
      ],
    });
  }

  async findTicketByDetailId(bookingDetailId: string): Promise<Ticket | null> {
    return this.ticketRepo.findOne({ where: { bookingDetailId } });
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
