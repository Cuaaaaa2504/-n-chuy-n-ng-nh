import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RefundService } from './refund.service';
import { Refund } from '../entities/refund.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('refunds')
@ApiBearerAuth()
// FIX: bỏ prefix 'api/' cho đồng bộ với các module khác (app không có global prefix)
@Controller('refunds')
export class RefundController {
  constructor(private readonly service: RefundService) {}

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // Khai báo TRƯỚC @Get(':id') để 'admin' không bị match thành :id

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Danh sách tất cả yêu cầu hoàn tiền (Admin)' })
  adminFindAll(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.adminFindAll({
      status,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Duyệt yêu cầu hoàn tiền (Admin)' })
  approve(
    @Param('id') id: string,
    @Body('providerRef') providerRef?: string,
  ): Promise<Refund> {
    return this.service.approve(id, providerRef);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Từ chối yêu cầu hoàn tiền (Admin)' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<Refund> {
    return this.service.reject(id, reason);
  }

  // ── Chung ───────────────────────────────────────────────────────────────

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Xem refunds theo booking' })
  findByBooking(@Param('bookingId') bookingId: string): Promise<Refund[]> {
    return this.service.findByBooking(bookingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết refund' })
  findOne(@Param('id') id: string): Promise<Refund> {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền' })
  create(@Body() body: Partial<Refund>): Promise<Refund> {
    return this.service.create(body);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Đánh dấu hoàn tiền thành công (Admin)' })
  complete(@Param('id') id: string): Promise<Refund> {
    return this.service.complete(id);
  }

  @Patch(':id/fail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Đánh dấu hoàn tiền thất bại (Admin)' })
  fail(@Param('id') id: string): Promise<Refund> {
    return this.service.fail(id);
  }
}
