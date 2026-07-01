import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  // Public — check voucher trước khi đặt vé
  @Get('validate')
  validate(
    @Query('code') code: string,
    @Query('amount') amount: string,
  ) {
    return this.voucherService.validateVoucher(code, Number(amount));
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.voucherService.findByCode(code);
  }

  // ADMIN
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.voucherService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateVoucherDto) {
    return this.voucherService.create(dto);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.deactivate(id);
  }
}
