import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * FIX BUG-05 — THỨ TỰ KHAI BÁO ROUTE RẤT QUAN TRỌNG.
 *
 * NestJS match route theo đúng thứ tự method được khai báo trong class.
 * Nếu `@Get(':showtimeId')` đứng trước, thì `GET /showtime-seats/my-holds/list`
 * sẽ bị match thành `:showtimeId = 'my-holds'` và ParseIntPipe ném
 * 400 "my-holds is not a number".
 *
 * QUY TẮC: mọi route LITERAL (my-holds/list, hold-details/:holdId, hold, hold-many,
 * release/:holdId, expire-holds) phải đặt TRƯỚC route động `:showtimeId`.
 * Khi thêm endpoint mới, luôn chèn phía trên getSeatMap().
 */
@Controller('showtime-seats')
export class ShowtimeSeatsController {
  constructor(private readonly showtimeSeatsService: ShowtimeSeatsService) {}

  @Get()
  getHello() {
    return this.showtimeSeatsService.getHello();
  }

  // ─────────── ROUTE LITERAL (phải nằm trên :showtimeId) ───────────

  @UseGuards(JwtAuthGuard)
  @Get('my-holds/list')
  getMyHolds(@Request() req) {
    return this.showtimeSeatsService.getMyHolds(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('hold-details/:holdId')
  getHoldDetails(@Request() req, @Param('holdId', ParseIntPipe) holdId: number) {
    return this.showtimeSeatsService.getHoldDetails(req.user.userId, holdId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold')
  holdSeat(@Request() req, @Body() dto: HoldSeatDto) {
    return this.showtimeSeatsService.holdSeat(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold-many')
  holdManySeats(@Request() req, @Body() dto: HoldManySeatsDto) {
    return this.showtimeSeatsService.holdManySeats(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('release/:holdId')
  releaseHold(@Request() req, @Param('holdId', ParseIntPipe) holdId: number) {
    return this.showtimeSeatsService.releaseHold(req.user.userId, holdId);
  }

  /**
   * FIX BUG-09: endpoint này chạy `EXEC sp_release_expired_holds` trên DB.
   * Trước đây public -> bất kỳ ai cũng spam được, gây tải nặng lên SQL Server.
   * Nay chỉ ADMIN gọi được (thủ công/vận hành). Việc dọn định kỳ tự động vẫn do
   * SeatHoldSchedulerService gọi thẳng service, không đi qua HTTP nên không bị chặn.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('expire-holds')
  expireSeatHolds() {
    return this.showtimeSeatsService.expireSeatHolds();
  }

  // ─────────── ROUTE ĐỘNG (luôn ở CUỐI CÙNG) ───────────

  /**
   * FIX BUG-05: bổ sung JwtAuthGuard.
   * Trước đây endpoint này public -> bất kỳ ai chưa đăng nhập cũng đọc được
   * trạng thái từng ghế, giá vé và thông tin phòng chiếu. Luồng đặt vé phía
   * frontend vốn đã nằm sau PrivateRoute nên việc yêu cầu đăng nhập không làm
   * mất chức năng nào.
   *
   * Nếu sau này cần cho phép xem sơ đồ ghế trước khi đăng nhập (preview), hãy
   * bỏ guard ở ĐÂY và thay bằng một endpoint public riêng chỉ trả về số ghế
   * trống — không kèm heldByUserId.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':showtimeId')
  getSeatMap(@Param('showtimeId', ParseIntPipe) showtimeId: number) {
    return this.showtimeSeatsService.getSeatMap(showtimeId);
  }
}
