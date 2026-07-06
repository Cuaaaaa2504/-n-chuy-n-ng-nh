import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../entities/voucher.entity';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  findAll(): Promise<Voucher[]> {
    return this.voucherRepo.find({ order: { promotionId: 'DESC' } });
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({
      where: { promotionCode: code.toUpperCase() },
    });
    if (!voucher)
      throw new NotFoundException(`Voucher '${code}' không tồn tại`);
    return voucher;
  }

  async validateVoucher(code: string, orderAmount: number) {
    const voucher = await this.findByCode(code);
    return this.validate(voucher, orderAmount);
  }

  validate(voucher: Voucher, orderAmount: number) {
    const now = new Date();
    if (now < voucher.startAt)
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
    if (now > voucher.endAt)
      throw new BadRequestException('Voucher đã hết hạn');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    if (
      voucher.minOrderAmount &&
      orderAmount < Number(voucher.minOrderAmount)
    )
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ để dùng voucher này`,
      );

    let discount = 0;
    if (voucher.discountType === 'PERCENT') {
      discount = (orderAmount * Number(voucher.discountValue)) / 100;
      if (voucher.maxDiscount)
        discount = Math.min(discount, Number(voucher.maxDiscount));
    } else {
      discount = Number(voucher.discountValue);
    }

    return {
      voucherId: voucher.promotionId,
      code: voucher.promotionCode,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount: discount,
    };
  }

  // FIX: sau khi validate và áp dụng voucher, tăng usedCount
  async applyVoucher(code: string, orderAmount: number) {
    const voucher = await this.findByCode(code);
    const result = this.validate(voucher, orderAmount);
    await this.voucherRepo.increment({ promotionId: voucher.promotionId }, 'usedCount', 1);
    return result;
  }

  async create(dto: { code: string; [key: string]: any }): Promise<Voucher> {
    const existing = await this.voucherRepo.findOne({
      where: { promotionCode: dto.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại');
    const data: any = { promotionCode: dto.code.toUpperCase(), ...dto };
    const voucher = this.voucherRepo.create(data as unknown as Voucher);
    return this.voucherRepo.save(voucher);
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({
      where: { promotionId: id },
    });
    if (!voucher) throw new NotFoundException(`Voucher #${id} không tồn tại`);
    return voucher;
  }

  async update(id: number, dto: Partial<Voucher>): Promise<Voucher> {
    await this.findOne(id);
    await this.voucherRepo.update({ promotionId: id }, dto);
    return this.findOne(id);
  }

  async deactivate(id: number): Promise<Voucher> {
    return this.update(id, { status: 'INACTIVE' } as any);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.voucherRepo.delete({ promotionId: id });
  }
}
