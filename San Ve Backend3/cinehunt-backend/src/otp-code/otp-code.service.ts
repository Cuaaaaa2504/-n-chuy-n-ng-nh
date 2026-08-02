import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { OtpCode } from '../entities/otp-code.entity';

export interface OtpGenerationResult {
  expiresAt: Date;
  code?: string;
}

@Injectable()
export class OtpCodeService {
  private readonly hashSecret: string;
  private readonly exposeCodeInDevelopment: boolean;

  constructor(
    @InjectRepository(OtpCode)
    private readonly repo: Repository<OtpCode>,
    configService: ConfigService,
  ) {
    this.hashSecret = configService.getOrThrow<string>('OTP_HASH_SECRET');
    this.exposeCodeInDevelopment =
      configService.get<string>('NODE_ENV') !== 'production' &&
      configService.get<string>('OTP_EXPOSE_CODE_IN_DEV') === 'true';
  }

  private hashCode(userId: number, purpose: string, code: string): string {
    return createHmac('sha256', this.hashSecret)
      .update(`${userId}:${purpose}:${code}`)
      .digest('hex');
  }

  private hashesMatch(expectedHex: string, actualHex: string): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async invalidateOldOtps(userId: number, purpose: string): Promise<void> {
    await this.repo.update(
      { userId, purpose, isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );
  }

  async generateOtp(
    userId: number,
    purpose: string,
    expiresInMinutes = 10,
  ): Promise<OtpGenerationResult> {
    await this.invalidateOldOtps(userId, purpose);

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const otp = this.repo.create({
      userId,
      purpose,
      code: this.hashCode(userId, purpose, code),
      expiresAt,
      isUsed: false,
      attempts: 0,
      usedAt: null,
    });
    await this.repo.save(otp);

    return {
      expiresAt,
      ...(this.exposeCodeInDevelopment ? { code } : {}),
    };
  }

  create(
    userId: number,
    purpose: string,
    expiresInMinutes = 10,
  ): Promise<OtpGenerationResult> {
    return this.generateOtp(userId, purpose, expiresInMinutes);
  }

  async verifyOtp(
    userId: number,
    code: string,
    purpose: string,
  ): Promise<OtpCode> {
    return this.repo.manager.transaction(async (manager) => {
      const otp = await manager.findOne(OtpCode, {
        where: { userId, purpose, isUsed: false },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!otp) {
        throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
      }

      const now = new Date();
      if (now > otp.expiresAt) {
        otp.isUsed = true;
        otp.usedAt = now;
        await manager.save(otp);
        throw new BadRequestException('OTP đã hết hạn');
      }

      const submittedHash = this.hashCode(userId, purpose, String(code));
      if (!this.hashesMatch(otp.code, submittedHash)) {
        otp.attempts += 1;
        if (otp.attempts >= 5) {
          otp.isUsed = true;
          otp.usedAt = now;
        }
        await manager.save(otp);
        throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
      }

      otp.isUsed = true;
      otp.usedAt = now;
      await manager.save(otp);
      return otp;
    });
  }

  verify(
    userId: number,
    code: string,
    purpose: string,
  ): Promise<OtpCode> {
    return this.verifyOtp(userId, code, purpose);
  }

  async cleanExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) });
  }
}
