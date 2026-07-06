import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OtpCode } from '../entities/otp-code.entity';

@Injectable()
export class OtpCodeService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly repo: Repository<OtpCode>,
  ) {}

  async invalidateOldOtps(userId: number, purpose: string): Promise<void> {
    await this.repo.update(
      { userId, purpose, isUsed: false } as any,
      { isUsed: true } as any,
    );
  }

  async generateOtp(userId: number, purpose: string, expiresInMinutes = 10): Promise<OtpCode> {
    await this.invalidateOldOtps(userId, purpose);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const data: any = { userId, purpose, code, expiresAt, isUsed: false };
    const otp = this.repo.create(data as unknown as OtpCode);
    return this.repo.save(otp);
  }

  create(userId: number, purpose: string, expiresInMinutes = 10): Promise<OtpCode> {
    return this.generateOtp(userId, purpose, expiresInMinutes);
  }

  async verifyOtp(userId: number, code: string, purpose: string): Promise<OtpCode> {
    const otp = await this.repo.findOne({
      where: { userId, code, purpose, isUsed: false } as any,
    });
    if (!otp) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    if (new Date() > (otp as any).expiresAt)
      throw new BadRequestException('OTP đã hết hạn');
    (otp as any).isUsed = true;
    await this.repo.save(otp);
    return otp;
  }

  verify(userId: number, code: string, purpose: string): Promise<OtpCode> {
    return this.verifyOtp(userId, code, purpose);
  }

  async cleanExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) } as any);
  }
}
