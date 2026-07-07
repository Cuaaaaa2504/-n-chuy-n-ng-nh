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
      throw new NotFoundException(`Voucher '${code}' kh\u00f4ng t\u1ed3n t\u1ea1i`);
    return voucher;
  }

  async validateVoucher(code: string, orderAmount: number) {
    const voucher = await this.findByCode(code);
    return this.validate(voucher, orderAmount);
  }

  validate(voucher: Voucher, orderAmount: number) {
    const now = new Date();
    const startDate = voucher.startAt ? new Date(voucher.startAt) : null;
    const endDate = voucher.endAt ? new Date(voucher.endAt) : null;

    if (startDate && now < startDate)
      throw new BadRequestException('Voucher ch\u01b0a \u0111\u1ebfn th\u1eddi gian s\u1eed d\u1ee5ng');
    if (endDate && now > endDate)
      throw new BadRequestException('Voucher \u0111\u00e3 h\u1ebft h\u1ea1n');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
      throw new BadRequestException('Voucher \u0111\u00e3 h\u1ebft l\u01b0\u1ee3t s\u1eed d\u1ee5ng');
    if (
      voucher.minOrderAmount &&
      orderAmount < Number(voucher.minOrderAmount)
    )
      throw new BadRequestException(
        `\u0110\u01a1n h\u00e0ng t\u1ed1i thi\u1ec3u ${Number(voucher.minOrderAmount).toLocaleString()}\u0111 \u0111\u1ec3 d\u00f9ng voucher n\u00e0y`,
      );

    let discount = 0;
    if (voucher.discountType === 'PERCENT' || voucher.discountType === 'PERCENTAGE') {
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
    if (existing) throw new BadRequestException('M\u00e3 voucher \u0111\u00e3 t\u1ed3n t\u1ea1i');
    const data: any = { promotionCode: dto.code.toUpperCase(), ...dto };
    const voucher = this.voucherRepo.create(data as unknown as Voucher);
    return this.voucherRepo.save(voucher);
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({
      where: { promotionId: id },
    });
    if (!voucher) throw new NotFoundException(`Voucher #${id} kh\u00f4ng t\u1ed3n t\u1ea1i`);
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
