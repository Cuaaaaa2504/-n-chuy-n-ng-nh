import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from '../entities/refund.entity';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private readonly repo: Repository<Refund>,
  ) {}

  findByBooking(bookingId: string): Promise<Refund[]> {
    return this.repo.find({
      where: { booking_id: bookingId },
      order: { requested_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Refund> {
    const refund = await this.repo.findOne({ where: { refund_id: id } });
    if (!refund) throw new NotFoundException(`Refund #${id} không tồn tại`);
    return refund;
  }

  create(data: Partial<Refund>): Promise<Refund> {
    return this.repo.save(this.repo.create(data));
  }

  async complete(id: string): Promise<Refund> {
    await this.findOne(id);
    await this.repo.update(
      { refund_id: id },
      { refund_status: 'SUCCESS', completed_at: new Date() },
    );
    return this.findOne(id);
  }

  async fail(id: string): Promise<Refund> {
    await this.findOne(id);
    await this.repo.update({ refund_id: id }, { refund_status: 'FAILED' });
    return this.findOne(id);
  }
}
