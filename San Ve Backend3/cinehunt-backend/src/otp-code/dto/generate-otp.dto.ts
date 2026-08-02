import { IsIn } from 'class-validator';

export const OTP_PURPOSES = [
  'VERIFY_EMAIL',
  'RESET_PASSWORD',
  'CHANGE_PHONE',
] as const;

export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export class GenerateOtpDto {
  @IsIn(OTP_PURPOSES, { message: 'Mục đích OTP không hợp lệ' })
  purpose: OtpPurpose;
}
