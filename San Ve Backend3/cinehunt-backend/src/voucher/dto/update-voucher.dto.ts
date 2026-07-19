import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVoucherDto } from './create-voucher.dto';

/**
 * Cập nhật voucher — mọi field optional.
 * Bỏ `code` vì mã voucher đã phát hành không nên đổi (tránh vỡ đơn hàng cũ).
 */
export class UpdateVoucherDto extends PartialType(
  OmitType(CreateVoucherDto, ['code'] as const),
) {}
