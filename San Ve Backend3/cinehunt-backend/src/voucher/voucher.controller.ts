import {
  Body,
  Controller,
  Delete,
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
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // Khai báo TRƯỚC @Get(':code') để 'admin' không bị match thành :code
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.voucherService.findAll(Number(page), Number(limit));
  }

  // Public — check voucher trước khi đặt vé
  @Get('validate')
  validate(@Query('code') code: string, @Query('amount') amount: string) {
    return this.voucherService.validateVoucher(code, Number(amount));
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.voucherService.findByCode(code);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateVoucherDto) {
    return this.voucherService.create(dto);
  }

  // FIX: thiếu endpoint sửa voucher — AdminVouchersPage cần PATCH /vouchers/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.update(id, dto as any);
  }

  // FIX [mục 4.3]: đã xoá alias `PUT /vouchers/:id`.
  // Nó gọi đúng `voucherService.update()` như PATCH ở trên, không thêm giá trị
  // gì ngoài việc tạo ra hai đường vào cho cùng một hành động. Frontend
  // (adminApi.voucherApi.update) chỉ dùng PATCH.

  // FIX: thiếu endpoint bật/tắt trạng thái active
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.toggleStatus(id);
  }

  // FIX [mục 4.4]: đã xoá `PATCH /vouchers/:id/deactivate`.
  // Báo cáo cho rằng thiếu trạng thái "deactivated" vĩnh viễn, nhưng nhìn vào
  // `voucherService.deactivate()` thì nó chỉ set `status = 'INACTIVE'` — CHÍNH
  // XÁC cùng một cột, cùng một giá trị mà `/toggle` đang set. Không hề có
  // trạng thái thứ ba nào trong DB (voucher.status chỉ có ACTIVE/INACTIVE).
  //
  // Nói cách khác đây là hai tên gọi cho một hành động, không phải hai vòng đời
  // khác nhau. Giữ lại chỉ khiến admin tưởng /deactivate là "khoá vĩnh viễn"
  // trong khi thực tế vẫn bật lại được bằng /toggle. Đã gộp về /toggle.

  // FIX: thiếu endpoint xoá voucher
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.remove(id);
  }
}
