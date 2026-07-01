import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OtpCodeService } from './otp-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('otp')
export class OtpCodeController {
  constructor(private readonly otpCodeService: OtpCodeService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Body('purpose') purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE',
  ) {
    return this.otpCodeService.generateOtp(user.userId, purpose);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verify(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { code: string; purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE' },
  ) {
    return this.otpCodeService.verifyOtp(user.userId, body.code, body.purpose);
  }
}
