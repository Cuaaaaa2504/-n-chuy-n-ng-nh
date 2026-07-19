import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../entities/voucher.entity';

export interface VoucherPage {
  items: Voucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  // FIX [M-16]: thêm pagination để tránh trả toàn bộ voucher khi hệ thống lớn
  async findAll(page = 1, limit = 20): Promise<VoucherPage> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.voucherRepo.findAndCount({
      order: { promotionId: 'DESC' },
      skip,
      take: limit,
    });
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
    const startDate = voucher.startAt ? new Date(voucher.startAt) : null;
    const endDate = voucher.endAt ? new Date(voucher.endAt) : null;

    if (startDate && now < startDate)
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
    if (endDate && now > endDate)
      throw new BadRequestException('Voucher đã hết hạn');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    if (
      voucher.minOrderAmount &&
      orderAmount < Number(voucher.minOrderAmount)
    )
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(voucher.minOrderAmount).toLocaleString()}đ để dùng voucher này`,
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
    const code = String(dto.code ?? '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Thiếu mã voucher');

    const existing = await this.voucherRepo.findOne({
      where: { promotionCode: code },
    });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại');

    // FIX: trước đây `...dto` giữ lại field `code` (không phải cột DB) và
    // thiếu promotion_name (NOT NULL) -> INSERT luôn fail.
    const { code: _ignored, promotionName, ...rest } = dto;
    const data: any = {
      ...rest,
      promotionCode: code,
      promotionName: promotionName ?? code,
      status: dto.status ?? 'ACTIVE',
      usedCount: 0,
    };

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

  /** FIX: bật/tắt trạng thái active của voucher (PATCH /vouchers/:id/toggle) */
  async toggleStatus(id: number): Promise<Voucher> {
    const voucher = await this.findOne(id);
    const next = voucher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.update(id, { status: next } as any);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const voucher = await this.findOne(id);

    // Voucher đã được dùng thì không xoá cứng (FK booking_orders.promotion_id),
    // chỉ vô hiệu hoá để giữ toàn vẹn dữ liệu đơn hàng cũ.
    if (voucher.usedCount > 0) {
      await this.update(id, { status: 'INACTIVE' } as any);
      return {
        success: true,
        message: `Voucher #${id} đã được sử dụng ${voucher.usedCount} lần — đã vô hiệu hoá thay vì xoá`,
      };
    }

    await this.voucherRepo.delete({ promotionId: id });
    return { success: true, message: `Đã xoá voucher #${id}` };
  }
}
