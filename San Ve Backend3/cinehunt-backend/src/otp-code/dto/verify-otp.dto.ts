import { IsIn, Matches } from 'class-validator';
import { OTP_PURPOSES, OtpPurpose } from './generate-otp.dto';

export class VerifyOtpDto {
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm đúng 6 chữ số' })
  code: string;

  @IsIn(OTP_PURPOSES, { message: 'Mục đích OTP không hợp lệ' })
  purpose: OtpPurpose;
}
