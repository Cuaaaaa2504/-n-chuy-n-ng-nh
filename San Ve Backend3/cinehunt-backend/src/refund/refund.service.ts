import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from '../entities/refund.entity';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private readonly repo: Repository<Refund>,
  ) {}

  async findByBooking(bookingId: string): Promise<Refund[]> {
    try {
      return await this.repo.find({
        where: { bookingId },
        order: { requestedAt: 'DESC' },
      });
    } catch {
      throw new InternalServerErrorException('Không tải được danh sách hoàn tiền');
    }
  }

  async findOne(id: string): Promise<Refund> {
    try {
      const refund = await this.repo.findOne({ where: { refundId: id } });
      if (!refund) throw new NotFoundException(`Refund #${id} không tồn tại`);
      return refund;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không tải được thông tin hoàn tiền');
    }
  }

  async create(data: Partial<Refund>): Promise<Refund> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch {
      throw new InternalServerErrorException('Không tạo được yêu cầu hoàn tiền');
    }
  }

  async complete(id: string): Promise<Refund> {
    try {
      await this.findOne(id);
      await this.repo.update(
        { refundId: id },
        { refundStatus: 'SUCCESS', completedAt: new Date() },
      );
      return this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được trạng thái hoàn tiền');
    }
  }

  async fail(id: string): Promise<Refund> {
    try {
      await this.findOne(id);
      await this.repo.update({ refundId: id }, { refundStatus: 'FAILED' });
      return this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được trạng thái hoàn tiền');
    }
  }

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // FIX: trước đây không có endpoint nào cho admin xem/duyệt yêu cầu hoàn tiền.

  /** Danh sách tất cả yêu cầu hoàn tiền + filter + phân trang */
  async adminFindAll(filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

    const qb = this.repo
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.booking', 'booking')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('refund.requestedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status?.trim()) {
      qb.andWhere('refund.refundStatus = :status', {
        status: filters.status.trim().toUpperCase(),
      });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r: any) => ({
        refundId: String(r.refundId),
        bookingId: String(r.bookingId),
        bookingCode: r.booking?.bookingCode ?? null,
        customerName: r.booking?.user?.fullName ?? null,
        customerEmail: r.booking?.user?.email ?? null,
        paymentId: String(r.paymentId),
        refundAmount: Number(r.refundAmount ?? 0),
        reason: r.reason,
        refundStatus: r.refundStatus,
        requestedAt: r.requestedAt,
        completedAt: r.completedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Admin duyệt yêu cầu hoàn tiền */
  async approve(id: string, providerRef?: string): Promise<Refund> {
    const refund = await this.findOne(id);
    if (refund.refundStatus !== 'PENDING') {
      throw new BadRequestException(
        `Yêu cầu hoàn tiền #${id} đã được xử lý (trạng thái: ${refund.refundStatus})`,
      );
    }
    await this.repo.update(
      { refundId: id },
      {
        refundStatus: 'SUCCESS',
        completedAt: new Date(),
        ...(providerRef ? { providerRef } : {}),
      },
    );
    return this.findOne(id);
  }

  /** Admin từ chối yêu cầu hoàn tiền */
  async reject(id: string, reason?: string): Promise<Refund> {
    const refund = await this.findOne(id);
    if (refund.refundStatus !== 'PENDING') {
      throw new BadRequestException(
        `Yêu cầu hoàn tiền #${id} đã được xử lý (trạng thái: ${refund.refundStatus})`,
      );
    }
    await this.repo.update(
      { refundId: id },
      {
        refundStatus: 'FAILED',
        completedAt: new Date(),
        ...(reason ? { reason } : {}),
      },
    );
    return this.findOne(id);
  }
}
