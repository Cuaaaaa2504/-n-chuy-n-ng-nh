import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, LessThan, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existedUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existedUser) throw new BadRequestException('Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      phone: dto.phone?.trim() ?? null,
      passwordHash: hashedPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);
    return {
      message: 'Đăng ký tài khoản thành công',
      user: this.toSafeUser(savedUser),
    };
  }

  async login(dto: LoginDto, meta?: { deviceInfo?: string; ipAddress?: string }) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.storeRefreshToken(user.userId, refreshToken, meta);

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: this.toSafeUser(user),
    };
  }

  async refresh(
    userId: number,
    incomingToken: string,
    meta?: { deviceInfo?: string; ipAddress?: string },
  ) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');

    const activeTokens = await this.refreshTokenRepository.find({
      where: { userId, revokedAt: IsNull() },
    });

    let matched: RefreshToken | null = null;
    for (const rt of activeTokens) {
      if (rt.expiresAt <= new Date()) continue;
      const ok = await bcrypt.compare(incomingToken, rt.tokenHash);
      if (ok) {
        matched = rt;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');

    matched.revokedAt = new Date();
    await this.refreshTokenRepository.save(matched);

    const tokens = await this.generateTokens(user);
    const newRt = await this.storeRefreshToken(user.userId, tokens.refreshToken, meta);

    matched.replacedById = newRt.refreshTokenId;
    await this.refreshTokenRepository.save(matched);

    return {
      message: 'Làm mới token thành công',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
    };
  }

  async logout(userId: number, incomingToken?: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (incomingToken) {
      const activeTokens = await this.refreshTokenRepository.find({
        where: { userId, revokedAt: IsNull() },
      });
      for (const rt of activeTokens) {
        const ok = await bcrypt.compare(incomingToken, rt.tokenHash);
        if (ok) {
          rt.revokedAt = new Date();
          await this.refreshTokenRepository.save(rt);
          break;
        }
      }
    } else {
      await this.revokeAllTokens(userId);
    }

    return { message: 'Đăng xuất thành công' };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    return this.toSafeUser(user);
  }

  async updateProfile(
    userId: number,
    dto: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() ?? null;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl ?? null;

    const updated = await this.userRepository.save(user);
    return { message: 'Cập nhật thông tin thành công', user: this.toSafeUser(updated) };
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu cũ');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
    await this.revokeAllTokens(userId);

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async getAllUsers() {
    const users = await this.userRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => this.toSafeUser(u));
  }

  async setUserStatus(targetId: number, status: 'ACTIVE' | 'BANNED' | 'DELETED') {
    const user = await this.userRepository.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.status = status;
    await this.userRepository.save(user);

    if (status !== 'ACTIVE') {
      await this.revokeAllTokens(targetId);
    }

    return { message: `Đã cập nhật trạng thái người dùng thành ${status}` };
  }

  private async storeRefreshToken(
    userId: number,
    rawToken: string,
    meta?: { deviceInfo?: string; ipAddress?: string },
  ): Promise<RefreshToken> {
    // FIX: parse robust hơn cho JWT_REFRESH_EXPIRES_IN — hỗ trợ '7d', '2w', '1h', số thuần
    const raw = (process.env.JWT_REFRESH_EXPIRES_IN || '7d').trim();
    let expiresInMs: number;
    const numMatch = raw.match(/^(\d+(\.\d+)?)(d|h|m|w)?$/i);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      const unit = (numMatch[3] || 'd').toLowerCase();
      const unitMs: Record<string, number> = {
        d: 86400000,
        h: 3600000,
        m: 60000,
        w: 604800000,
      };
      expiresInMs = val * (unitMs[unit] ?? unitMs['d']);
    } else {
      expiresInMs = 7 * 86400000; // fallback 7 ngày
    }

    const expiresAt = new Date(Date.now() + expiresInMs);
    const tokenHash = await bcrypt.hash(rawToken, 10);

    const rt = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      deviceInfo: meta?.deviceInfo ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt,
      revokedAt: null,
    });

    return this.refreshTokenRepository.save(rt);
  }

  private async revokeAllTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async cleanExpiredTokens(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    await this.refreshTokenRepository.delete({ expiresAt: LessThan(cutoff) });
  }

  private async generateTokens(user: User) {
    // FIX: đảm bảo JWT secrets không undefined — nếu thiếu env thì throw ngay khi khởi động
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT_SECRET hoặc JWT_REFRESH_SECRET chưa được cấu hình trong .env');
    }

    const payload = { sub: user.userId, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toSafeUser(user: User) {
    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
