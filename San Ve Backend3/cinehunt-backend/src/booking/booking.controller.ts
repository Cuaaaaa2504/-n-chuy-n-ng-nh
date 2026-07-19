import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingRequest, BookingResponse } from './dto';
import {
  AdminBookingQueryDto,
  UpdateBookingStatusDto,
} from './dto/admin-booking-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() request: CreateBookingRequest,
  ): Promise<BookingResponse> {
    const userId = req.user.userId;
    return this.bookingService.createBooking(userId, request);
  }

  // ── ADMIN ───────────────────────────────────────────────────────────────
  // FIX [Critical]: các route 'admin/...' phải khai báo TRƯỚC @Get(':id')
  // để NestJS không match nhầm 'admin' thành :id.

  /** Toàn bộ đơn đặt vé + filter + phân trang (chỉ ADMIN) */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async adminGetAllBookings(@Query() query: AdminBookingQueryDto) {
    return this.bookingService.adminFindAll(query);
  }

  /** Admin xem chi tiết bất kỳ booking nào */
  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async adminGetBookingDetail(@Param('id') id: string) {
    return this.bookingService.adminGetBookingDetail(id);
  }

  /** Admin chủ động cập nhật trạng thái đơn hàng */
  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async adminUpdateBookingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingService.adminUpdateStatus(id, dto.status);
  }

  // ── USER ────────────────────────────────────────────────────────────────

  // MUST be before @Get(':id') to avoid NestJS matching 'my' as :id
  @Get('my')
  async getMyBookings(@Request() req) {
    const userId = req.user.userId;
    return this.bookingService.getMyBookings(userId);
  }

  // FIX: Thêm route GET :id/tickets cho MyTicketsPage
  // Route literal '/tickets' phải đặt TRƯỚC @Get(':id') để NestJS ưu tiên match đúng
  @Get(':id/tickets')
  async getBookingTickets(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.bookingService.getBookingTickets(id, userId);
  }

  @Get(':id')
  async getBookingDetail(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.bookingService.getBookingDetail(id, userId);
  }

  @Delete(':id')
  async cancelBooking(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.bookingService.cancelBooking(id, userId);
  }
}
