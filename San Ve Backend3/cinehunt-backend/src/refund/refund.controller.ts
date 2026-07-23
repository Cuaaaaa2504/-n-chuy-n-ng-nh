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
// FIX: bỏ prefix 'api/' cho đồng bộ với các module khác (app không có global prefix)
//
// FIX [mục 5.x — bảo mật]: gắn @UseGuards(JwtAuthGuard) ở cấp CONTROLLER.
// Trước đây `GET /refunds/booking/:bookingId` và `GET /refunds/:id` KHÔNG có
// guard nào cả — bất kỳ ai không đăng nhập cũng đọc được lịch sử hoàn tiền của
// người khác (số tiền, lý do, mã giao dịch) chỉ bằng cách dò id tăng dần.
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly service: RefundService) {}

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // Khai báo TRƯỚC @Get(':id') để 'admin' không bị match thành :id

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

  /**
   * FIX [mục 5.4 + 5.5 — báo cáo hiểu sai vấn đề]
   *
   * Hai route `PATCH /refunds/:id/complete` và `PATCH /refunds/:id/fail` đã bị
   * XOÁ. Báo cáo cho rằng refund bị "kẹt ở APPROVED mãi mãi vì thiếu bước
   * complete", nhưng schema thực tế không hề có trạng thái APPROVED:
   *
   *     CONSTRAINT CK_refunds_status
   *       CHECK (refund_status IN ('PENDING', 'SUCCESS', 'FAILED'))
   *
   * Chỉ có 3 trạng thái. `approve()` đã set thẳng SUCCESS + completed_at, còn
   * `complete()` cũng set SUCCESS + completed_at — hai hàm làm y hệt nhau.
   * Tương tự `reject()` và `fail()` đều set FAILED.
   *
   * Nguy hiểm hơn: complete/fail KHÔNG kiểm tra trạng thái hiện tại, nên admin
   * có thể lật một refund đã FAILED thành SUCCESS (và ngược lại) không giới
   * hạn số lần — trong khi approve/reject chặn đúng bằng check `!== 'PENDING'`.
   * Giữ lại 2 route lỏng lẻo này chính là kịch bản "bypass qua route yếu nhất".
   *
   * Vòng đời chuẩn còn lại: PENDING → (approve) SUCCESS | (reject) FAILED.
   */

  // ── Người dùng ──────────────────────────────────────────────────────────

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Xem trạng thái hoàn tiền của một đơn' })
  findByBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Refund[]> {
    // Admin xem được mọi đơn, user chỉ xem được đơn của chính mình.
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

  /**
   * FIX [mục 5.1]: người dùng gửi yêu cầu hoàn tiền sau khi huỷ đơn ĐÃ THANH TOÁN.
   * Body chỉ còn { bookingId, reason? } — xem CreateRefundDto để biết vì sao.
   */
  @Post()
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền cho đơn của chính mình' })
  create(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Refund> {
    return this.service.createForUser(dto, user.userId);
  }
}
