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
import { CreateRefundDto } from './dto/create-refund.dto';
import { Refund } from '../entities/refund.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@ApiTags('refunds')
@ApiBearerAuth()
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly service: RefundService) {}

  // ADMIN

  @Get('admin/all')
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Duyệt + xác nhận đã chuyển tiền (Admin)' })
  approve(
    @Param('id') id: string,
    @Body('providerRef') providerRef?: string,
  ): Promise<Refund> {
    return this.service.approve(id, providerRef);
  }

  @Patch('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Từ chối / ghi nhận hoàn tiền thất bại (Admin)' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<Refund> {
    return this.service.reject(id, reason);
  }



  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Xem trạng thái hoàn tiền của một đơn' })
  findByBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Refund[]> {
    return this.service.findByBooking(bookingId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một yêu cầu hoàn tiền' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Refund> {
    return this.service.findOneForUser(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền cho đơn của chính mình' })
  create(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Refund> {
    return this.service.createForUser(dto, user.userId);
  }
}
