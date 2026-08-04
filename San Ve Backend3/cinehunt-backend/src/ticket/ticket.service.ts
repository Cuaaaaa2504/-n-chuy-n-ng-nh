import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

type LockedTicketRow = {
  ticket_id: string;
  ticket_code: string;
  ticket_status: string;
  can_check_in: boolean | number;
};

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeReference(reference: string): string {
    return String(reference ?? '').trim().toUpperCase();
  }

  async findByCode(ticketCode: string) {
    const normalized = this.normalizeReference(ticketCode);
    const ticket = await this.ticketRepo.findOne({
      where: { ticketCode: normalized },
      relations: {
        bookingDetail: {
          bookingOrder: true,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Vé ${normalized} không tồn tại`);
    }

    return ticket;
  }

  /*
   * Khách hàng chỉ được xem vé thuộc booking của chính mình.
   * STAFF và ADMIN được phép tra cứu mọi vé để phục vụ soát vé tại rạp.
   */
  async findAccessibleByCode(
    ticketCode: string,
    requester: CurrentUserPayload,
  ) {
    const ticket = await this.findByCode(ticketCode);
    const privileged = ['STAFF', 'ADMIN'].includes(
      String(requester.role ?? '').toUpperCase(),
    );
    const ownerId = ticket.bookingDetail?.bookingOrder?.userId;

    if (!privileged && ownerId !== requester.userId) {
      throw new ForbiddenException('Bạn không có quyền xem vé này');
    }

    return ticket;
  }

  async checkIn(reference: string, staffId: number) {
    const normalized = this.normalizeReference(reference);

    if (!normalized) {
      throw new BadRequestException('Thiếu mã vé hoặc mã đơn');
    }

    return normalized.startsWith('BK-')
      ? this.checkInBooking(normalized, staffId)
      : this.checkInTicket(normalized, staffId);
  }

  private assertCheckInAllowed(rows: LockedTicketRow[]) {
    for (const ticket of rows) {
      if (ticket.ticket_status === 'USED') {
        throw new BadRequestException(
          `Vé ${ticket.ticket_code} đã được check-in rồi`,
        );
      }

      if (ticket.ticket_status === 'CANCELLED') {
        throw new BadRequestException(`Vé ${ticket.ticket_code} đã bị huỷ`);
      }

      if (ticket.ticket_status === 'EXPIRED') {
        throw new BadRequestException(`Vé ${ticket.ticket_code} đã hết hạn`);
      }

      if (ticket.ticket_status !== 'VALID') {
        throw new BadRequestException(
          `Vé ${ticket.ticket_code} không ở trạng thái hợp lệ`,
        );
      }

      if (!Boolean(ticket.can_check_in)) {
        throw new BadRequestException(
          `Vé ${ticket.ticket_code} chỉ được quét trong khoảng 30 phút trước hoặc sau giờ chiếu`,
        );
      }
    }
  }

  private async checkInTicket(ticketCode: string, staffId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const rows = (await queryRunner.query(
        `
          SELECT
            t.ticket_id,
            t.ticket_code,
            t.ticket_status,
            CAST(
              CASE
                WHEN CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATETIME2) BETWEEN DATEADD(MINUTE, -30, st.start_time)
                  AND DATEADD(MINUTE, 30, st.start_time)
                THEN 1 ELSE 0
              END
              AS BIT
            ) AS can_check_in
          FROM dbo.tickets AS t WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.booking_details AS bd
            ON bd.booking_detail_id = t.booking_detail_id
          INNER JOIN dbo.booking_orders AS bo
            ON bo.booking_id = bd.booking_id
          INNER JOIN dbo.showtimes AS st
            ON st.showtime_id = bo.showtime_id
          WHERE t.ticket_code = @0;
        `,
        [ticketCode],
      )) as LockedTicketRow[];

      if (!rows.length) {
        throw new NotFoundException(`Vé ${ticketCode} không tồn tại`);
      }

      this.assertCheckInAllowed(rows);
      const checkedInAt = new Date();

      await queryRunner.query(
        `
          UPDATE dbo.tickets
          SET ticket_status = 'USED',
              checked_in_at = @1,
              checked_in_by = @2
          WHERE ticket_id = @0
            AND ticket_status = 'VALID';
        `,
        [rows[0].ticket_id, checkedInAt, staffId],
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Check-in thành công',
        ticketCode: rows[0].ticket_code,
        checkedInAt,
        ticketCount: 1,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async checkInBooking(bookingCode: string, staffId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const rows = (await queryRunner.query(
        `
          SELECT
            t.ticket_id,
            t.ticket_code,
            t.ticket_status,
            CAST(
              CASE
                WHEN CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATETIME2) BETWEEN DATEADD(MINUTE, -30, st.start_time)
                  AND DATEADD(MINUTE, 30, st.start_time)
                THEN 1 ELSE 0
              END
              AS BIT
            ) AS can_check_in
          FROM dbo.booking_orders AS bo WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.booking_details AS bd
            ON bd.booking_id = bo.booking_id
          INNER JOIN dbo.tickets AS t WITH (UPDLOCK, HOLDLOCK)
            ON t.booking_detail_id = bd.booking_detail_id
          INNER JOIN dbo.showtimes AS st
            ON st.showtime_id = bo.showtime_id
          WHERE bo.booking_code = @0
          ORDER BY t.ticket_id;
        `,
        [bookingCode],
      )) as LockedTicketRow[];

      if (!rows.length) {
        throw new NotFoundException(
          `Đơn ${bookingCode} không tồn tại hoặc chưa có vé điện tử`,
        );
      }

      this.assertCheckInAllowed(rows);
      const checkedInAt = new Date();

      await queryRunner.query(
        `
          UPDATE t
          SET t.ticket_status = 'USED',
              t.checked_in_at = @1,
              t.checked_in_by = @2
          FROM dbo.tickets AS t
          INNER JOIN dbo.booking_details AS bd
            ON bd.booking_detail_id = t.booking_detail_id
          INNER JOIN dbo.booking_orders AS bo
            ON bo.booking_id = bd.booking_id
          WHERE bo.booking_code = @0
            AND t.ticket_status = 'VALID';
        `,
        [bookingCode, checkedInAt, staffId],
      );

      await queryRunner.commitTransaction();

      return {
        message: `Check-in thành công ${rows.length} vé`,
        ticketCode: bookingCode,
        checkedInAt,
        ticketCount: rows.length,
        ticketCodes: rows.map((ticket) => ticket.ticket_code),
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
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
