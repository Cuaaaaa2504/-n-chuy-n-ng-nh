import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../entities/voucher.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  async findAll() {
    return this.voucherRepo.find({ order: { promotion_id: 'DESC' } });
  }

  async findByCode(code: string) {
    const voucher = await this.voucherRepo.findOne({
      where: { promotion_code: code.toUpperCase() },
    });
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');
    return voucher;
  }

  async validateVoucher(code: string, orderAmount: number) {
    const voucher = await this.findByCode(code);
    const now = new Date();

    if (voucher.status !== 'ACTIVE')
      throw new BadRequestException('Voucher không còn hiệu lực');
    if (now < voucher.start_at)
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
    if (now > voucher.end_at)
      throw new BadRequestException('Voucher đã hết hạn');
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit)
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    if (voucher.min_order_amount && orderAmount < Number(voucher.min_order_amount))
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${voucher.min_order_amount.toLocaleString()}đ để dùng voucher này`,
      );

    let discount = 0;
    if (voucher.discount_type === 'PERCENT') {
      discount = (orderAmount * Number(voucher.discount_value)) / 100;
      if (voucher.max_discount) {
        discount = Math.min(discount, Number(voucher.max_discount));
      }
    } else {
      discount = Number(voucher.discount_value);
    }

    return {
      voucherId: voucher.promotion_id,
      code: voucher.promotion_code,
      discountType: voucher.discount_type,
      discountValue: voucher.discount_value,
      discountAmount: Math.min(discount, orderAmount),
    };
  }

  async create(dto: CreateVoucherDto) {
    const existed = await this.voucherRepo.findOne({
      where: { promotion_code: dto.code.toUpperCase() },
    });
    if (existed) throw new BadRequestException('Mã voucher đã tồn tại');

    const voucher = this.voucherRepo.create({
      promotion_code: dto.code.toUpperCase(),
      promotion_name: dto.code.toUpperCase(),   // fallback; DTO có thể bổ sung tên sau
      discount_type: dto.discountType,
      discount_value: dto.discountValue,
      max_discount: dto.maxDiscount ?? null,
      min_order_amount: dto.minOrderAmount ?? 0,
      start_at: new Date(dto.startAt),
      end_at: new Date(dto.endAt),
      usage_limit: dto.usageLimit ?? null,
      used_count: 0,
      status: 'ACTIVE',
    });

    return this.voucherRepo.save(voucher);
  }

  async deactivate(id: number) {
    const voucher = await this.voucherRepo.findOne({ where: { promotion_id: id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');
    voucher.status = 'INACTIVE';
    await this.voucherRepo.save(voucher);
    return { message: 'Đã vô hiệu hóa voucher' };
  }
}
