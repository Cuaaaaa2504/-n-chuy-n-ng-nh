import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVoucherDto } from './create-voucher.dto';

export class UpdateVoucherDto extends PartialType(
  OmitType(CreateVoucherDto, ['code'] as const),
) {}
