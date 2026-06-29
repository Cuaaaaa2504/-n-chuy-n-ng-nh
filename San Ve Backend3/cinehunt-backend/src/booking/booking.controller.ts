import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingRequest, BookingResponse } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Request() req,
    @Body() request: CreateBookingRequest,
  ): Promise<BookingResponse> {
    const userId = req.user.user_id;
    return this.bookingService.createBooking(userId, request);
  }

  @Get(':id')
  async getBookingDetail(@Request() req, @Param('id') id: string) {
    const userId = req.user.user_id;
    return this.bookingService.getBookingDetail(+id, userId);
  }

  @Delete(':id')
  async cancelBooking(@Request() req, @Param('id') id: string) {
    const userId = req.user.user_id;
    return this.bookingService.cancelBooking(+id, userId);
  }
}