import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Tra cứu vé theo mã (dùng cho trang hiển thị QR)' })
  findByCode(@Param('code') code: string) {
    return this.ticketService.findByCode(code);
  }

  /**
   * FIX [mục 7.2 — lỗi thật, im lặng, rất khó phát hiện]
   *
   * Code cũ:  checkIn(code, req.user.user_id)
   *
   * `JwtStrategy.validate()` trả về `{ userId, email, role }` — KHÔNG hề có
   * field `user_id`. Vì vậy `req.user.user_id` luôn là `undefined`, và cột
   * `checked_in_by` luôn bị ghi NULL: check-in vẫn "thành công", vé vẫn đổi
   * sang USED, nhưng hệ thống KHÔNG BAO GIỜ biết nhân viên nào đã quét vé.
   * Mất hoàn toàn khả năng truy vết khi có tranh chấp tại quầy.
   *
   * Dùng @CurrentUser() để lấy đúng payload đã được type hoá, thay vì đọc
   * `req.user` dạng `any` — kiểu dữ liệu sẽ bắt lỗi này ngay lúc biên dịch.
   */
  @Post(':code/checkin')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Check-in vé tại rạp (STAFF/ADMIN)' })
  checkIn(
    @Param('code') code: string,
    @CurrentUser() staff: CurrentUserPayload,
  ) {
    return this.ticketService.checkIn(code, staff.userId);
  }
}
