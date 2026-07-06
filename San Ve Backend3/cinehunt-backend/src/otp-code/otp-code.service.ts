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
      { userId, purpose, isUsed: false },
      { isUsed: true },
    );
  }

  async create(userId: number, purpose: string, expiresInMinutes = 10): Promise<OtpCode> {
    await this.invalidateOldOtps(userId, purpose);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const otp = this.repo.create({
      userId,
      purpose,
      code,
      expiresAt,
      isUsed: false,
    });
    return this.repo.save(otp);
  }

  async verify(userId: number, code: string, purpose: string): Promise<OtpCode> {
    const otp = await this.repo.findOne({
      where: { userId, code, purpose, isUsed: false },
    });
    if (!otp) throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');

    if (new Date() > otp.expiresAt)
      throw new BadRequestException('OTP đã hết hạn');

    otp.isUsed = true;
    await this.repo.save(otp);
    return otp;
  }

  async cleanExpired(): Promise<void> {
    await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
