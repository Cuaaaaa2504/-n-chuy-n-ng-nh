import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
}
