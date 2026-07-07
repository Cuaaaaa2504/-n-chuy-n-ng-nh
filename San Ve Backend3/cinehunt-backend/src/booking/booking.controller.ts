import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  CreateBookingRequest,
  BookingResponse,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
  ) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() request: CreateBookingRequest,
  ): Promise<BookingResponse> {
    const userId = req.user.userId;
    return this.bookingService.createBooking(userId, request);
  }

  // MUST be before @Get(':id') to avoid NestJS matching 'my' as :id
  @Get('my')
  async getMyBookings(@Request() req) {
    const userId = req.user.userId;
    return this.bookingService.getMyBookings(userId);
  }

  // FIX: Thêm route GET :id/tickets cho MyTicketsPage
  // Route literal '/tickets' phải đặt TRƯỚC @Get(':id') để NestJS ưu tiên match đúng
  @Get(':id/tickets')
  async getBookingTickets(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getBookingTickets(id, userId);
  }

  @Get(':id')
  async getBookingDetail(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getBookingDetail(id, userId);
  }

  @Delete(':id')
  async cancelBooking(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    return this.bookingService.cancelBooking(id, userId);
  }
}
