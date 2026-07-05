import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RefundService } from './refund.service';
import { Refund } from '../entities/refund.entity';

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
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền' })
  create(@Body() body: Partial<Refund>): Promise<Refund> {
    return this.service.create(body);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Đánh dấu hoàn tiền thành công' })
  complete(@Param('id') id: string): Promise<Refund> {
    return this.service.complete(id);
  }

  @Patch(':id/fail')
  @ApiOperation({ summary: 'Đánh dấu hoàn tiền thất bại' })
  fail(@Param('id') id: string): Promise<Refund> {
    return this.service.fail(id);
  }
}
