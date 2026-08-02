import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpCodeService } from './otp-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import {
  OTP_VERIFY_THROTTLE,
  SENSITIVE_THROTTLE,
} from '../common/constants/throttle.constants';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('otp')
@UseGuards(JwtAuthGuard)
export class OtpCodeController {
  constructor(private readonly otpCodeService: OtpCodeService) {}

  @Throttle(SENSITIVE_THROTTLE)
  @Post('generate')
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateOtpDto,
  ) {
    return this.otpCodeService.generateOtp(user.userId, dto.purpose);
  }

  @Throttle(OTP_VERIFY_THROTTLE)
  @Post('verify')
  verify(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.otpCodeService.verifyOtp(
      user.userId,
      dto.code,
      dto.purpose,
    );
  }
}
