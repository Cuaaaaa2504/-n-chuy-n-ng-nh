import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
@Controller('api/refunds')
export class RefundController {
  constructor(private readonly service: RefundService) {}

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
