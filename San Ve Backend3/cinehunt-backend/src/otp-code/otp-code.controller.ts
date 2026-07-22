import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpCodeService } from './otp-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import {
  OTP_VERIFY_THROTTLE,
  SENSITIVE_THROTTLE,
} from '../common/constants/throttle.constants';

@Controller('otp')
export class OtpCodeController {
  constructor(private readonly otpCodeService: OtpCodeService) {}

  // Siết chặt: 3 lần / 60s — chống spam gửi OTP (tốn SMS/email + DoS).
  @Throttle(SENSITIVE_THROTTLE)
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Body('purpose') purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE',
  ) {
    return this.otpCodeService.generateOtp(user.userId, purpose);
  }

  // Siết chặt: 5 lần / 60s — chống brute-force dò mã OTP 6 số.
  @Throttle(OTP_VERIFY_THROTTLE)
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verify(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { code: string; purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE' },
  ) {
    return this.otpCodeService.verifyOtp(user.userId, body.code, body.purpose);
  }
}
