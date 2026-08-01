import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { BookingOrder } from '../entities/booking-order.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(BookingOrder)
    private readonly bookingRepo: Repository<BookingOrder>,
  ) {}

  async findByCode(ticketCode: string) {
    const normalized = String(ticketCode ?? '').trim().toUpperCase();
    const ticket = await this.ticketRepo.findOne({
      where: { ticketCode: normalized },
      relations: ['bookingDetail'],
    });

    if (!ticket) {
      throw new NotFoundException(`Vé ${normalized} không tồn tại`);
    }

    return ticket;
  }

  async checkIn(reference: string, staffId: number) {
    const normalized = String(reference ?? '').trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Thiếu mã vé');
    }

    if (normalized.startsWith('BK-')) {
      return this.checkInBooking(normalized, staffId);
    }

    const ticket = await this.findByCode(normalized);
    this.assertCheckInAllowed(ticket);

    const checkedInAt = new Date();

    await this.ticketRepo.manager.transaction(async (manager) => {
      await manager.update(
        Ticket,
        { ticketId: ticket.ticketId },
        {
          ticketStatus: 'USED',
          checkedInAt,
          checkedInBy: staffId,
        },
      );
    });

    return {
      message: 'Check-in thành công',
      ticketCode: ticket.ticketCode,
      checkedInAt,
      ticketCount: 1,
    };
  }

  private async checkInBooking(bookingCode: string, staffId: number) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingCode },
      relations: ['bookingDetails', 'bookingDetails.ticket'],
    });

    if (!booking) {
      throw new NotFoundException(`Đơn ${bookingCode} không tồn tại`);
    }

    const tickets = (booking.bookingDetails ?? [])
      .map((detail) => detail.ticket)
      .filter((ticket): ticket is Ticket => Boolean(ticket));

    if (!tickets.length) {
      throw new NotFoundException(
        `Đơn ${bookingCode} chưa có vé điện tử được phát hành`,
      );
    }

    tickets.forEach((ticket) => this.assertCheckInAllowed(ticket));

    const checkedInAt = new Date();

    await this.ticketRepo.manager.transaction(async (manager) => {
      for (const ticket of tickets) {
        await manager.update(
          Ticket,
          { ticketId: ticket.ticketId },
          {
            ticketStatus: 'USED',
            checkedInAt,
            checkedInBy: staffId,
          },
        );
      }
    });

    return {
      message: `Check-in thành công ${tickets.length} vé`,
      ticketCode: bookingCode,
      checkedInAt,
      ticketCount: tickets.length,
      ticketCodes: tickets.map((ticket) => ticket.ticketCode),
    };
  }

  private assertCheckInAllowed(ticket: Ticket) {
    if (ticket.ticketStatus === 'USED') {
      throw new BadRequestException(
        `Vé ${ticket.ticketCode} đã được check-in rồi`,
      );
    }

    if (ticket.ticketStatus === 'CANCELLED') {
      throw new BadRequestException(`Vé ${ticket.ticketCode} đã bị huỷ`);
    }

    if (ticket.ticketStatus === 'EXPIRED') {
      throw new BadRequestException(`Vé ${ticket.ticketCode} đã hết hạn`);
    }

    if (ticket.ticketStatus !== 'VALID') {
      throw new BadRequestException(
        `Vé ${ticket.ticketCode} không ở trạng thái hợp lệ`,
      );
    }
  }

  async findByBookingDetail(bookingDetailId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { bookingDetailId },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy vé');
    }

    return ticket;
  }
}
