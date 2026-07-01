import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OtpCode } from '../entities/otp-code.entity';

@Injectable()
export class OtpCodeService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
  ) {}

  async generateOtp(
    userId: number,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE',
  ) {
    // Hủy các OTP cũ cùng purpose chưa dùng
    await this.otpRepo.update(
      { user_id: userId, purpose, is_used: false },
      { is_used: true },
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    const otp = this.otpRepo.create({
      user_id: userId,
      code,
      purpose,
      expires_at: expiresAt,
      is_used: false,
    });

    await this.otpRepo.save(otp);
    return { code, expiresAt, message: 'OTP đã được tạo (10 phút)' };
  }

  async verifyOtp(
    userId: number,
    code: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_PHONE',
  ) {
    const otp = await this.otpRepo.findOne({
      where: { user_id: userId, code, purpose, is_used: false },
    });

    if (!otp) throw new NotFoundException('OTP không hợp lệ hoặc đã được sử dụng');
    if (new Date() > otp.expires_at)
      throw new BadRequestException('OTP đã hết hạn');

    otp.is_used = true;
    await this.otpRepo.save(otp);

    return { message: 'Xác thực OTP thành công' };
  }

  // Dọn OTP hết hạn (gọi từ scheduler nếu cần)
  async cleanExpiredOtps() {
    const result = await this.otpRepo.delete({
      expires_at: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
