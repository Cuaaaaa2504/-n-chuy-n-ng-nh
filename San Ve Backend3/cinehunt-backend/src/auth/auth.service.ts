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

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existedUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existedUser) throw new BadRequestException('Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      full_name: dto.fullName.trim(),
      email: normalizedEmail,
      phone: dto.phone?.trim() ?? null,
      password_hash: hashedPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      email_verified: false,
    });

    const savedUser = await this.userRepository.save(user);
    return {
      message: 'Đăng ký tài khoản thành công',
      user: this.toSafeUser(savedUser),
    };
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, meta?: { deviceInfo?: string; ipAddress?: string }) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    user.last_login_at = new Date();
    await this.userRepository.save(user);

    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Lưu refresh token vào bảng refresh_tokens (không ghi lên cột users)
    await this.storeRefreshToken(user.user_id, refreshToken, meta);

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: this.toSafeUser(user),
    };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────

  async refresh(
    userId: number,
    incomingToken: string,
    meta?: { deviceInfo?: string; ipAddress?: string },
  ) {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');

    // Tìm tất cả token active của user để compare (tránh brute-force từng hash)
    const activeTokens = await this.refreshTokenRepository.find({
      where: { user_id: userId, revoked_at: IsNull() },
    });

    let matched: RefreshToken | null = null;
    for (const rt of activeTokens) {
      if (rt.expires_at <= new Date()) continue; // bỏ qua expired
      const ok = await bcrypt.compare(incomingToken, rt.token_hash);
      if (ok) {
        matched = rt;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');

    // Rotate: revoke token cũ
    matched.revoked_at = new Date();
    await this.refreshTokenRepository.save(matched);

    // Tạo cặp token mới
    const tokens = await this.generateTokens(user);
    const newRt = await this.storeRefreshToken(user.user_id, tokens.refreshToken, meta);

    // Ghi replaced_by để trace token chain
    matched.replaced_by_id = newRt.refresh_token_id;
    await this.refreshTokenRepository.save(matched);

    return {
      message: 'Làm mới token thành công',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
    };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  async logout(userId: number, incomingToken?: string) {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (incomingToken) {
      // Logout thiết bị hiện tại: revoke đúng token đang dùng
      const activeTokens = await this.refreshTokenRepository.find({
        where: { user_id: userId, revoked_at: IsNull() },
      });
      for (const rt of activeTokens) {
        const ok = await bcrypt.compare(incomingToken, rt.token_hash);
        if (ok) {
          rt.revoked_at = new Date();
          await this.refreshTokenRepository.save(rt);
          break;
        }
      }
    } else {
      // Logout tất cả thiết bị: revoke hết
      await this.revokeAllTokens(userId);
    }

    return { message: 'Đăng xuất thành công' };
  }

  // ─── PROFILE ──────────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    return this.toSafeUser(user);
  }

  async updateProfile(
    userId: number,
    dto: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.fullName !== undefined) user.full_name = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() ?? null;
    if (dto.avatarUrl !== undefined) user.avatar_url = dto.avatarUrl ?? null;

    const updated = await this.userRepository.save(user);
    return { message: 'Cập nhật thông tin thành công', user: this.toSafeUser(updated) };
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu cũ');

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    // Invalidate tất cả refresh token khi đổi mật khẩu (kick khỏi mọi thiết bị)
    await this.revokeAllTokens(userId);

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  async getAllUsers() {
    const users = await this.userRepository.find({ order: { created_at: 'DESC' } });
    return users.map((u) => this.toSafeUser(u));
  }

  async setUserStatus(targetId: number, status: 'ACTIVE' | 'BANNED' | 'DELETED') {
    const user = await this.userRepository.findOne({ where: { user_id: targetId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.status = status;
    await this.userRepository.save(user);

    // Kick ngay khi ban/delete — revoke hết token
    if (status !== 'ACTIVE') {
      await this.revokeAllTokens(targetId);
    }

    return { message: `Đã cập nhật trạng thái người dùng thành ${status}` };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Lưu refresh token mới vào DB dưới dạng hash.
   * Trả về entity đã lưu để caller có thể ghi replaced_by_id.
   */
  private async storeRefreshToken(
    userId: number,
    rawToken: string,
    meta?: { deviceInfo?: string; ipAddress?: string },
  ): Promise<RefreshToken> {
    const expiresInDays = parseInt(
      (process.env.JWT_REFRESH_EXPIRES_IN || '7d').replace('d', ''),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isNaN(expiresInDays) ? 7 : expiresInDays));

    const tokenHash = await bcrypt.hash(rawToken, 10);

    const rt = this.refreshTokenRepository.create({
      user_id: userId,
      token_hash: tokenHash,
      device_info: meta?.deviceInfo ?? null,
      ip_address: meta?.ipAddress ?? null,
      expires_at: expiresAt,
      revoked_at: null,
    });

    return this.refreshTokenRepository.save(rt);
  }

  /** Revoke tất cả token active của một user (logout all devices). */
  private async revokeAllTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked_at: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  /** Xoá các token đã hết hạn > 30 ngày (có thể gọi từ cron job). */
  async cleanExpiredTokens(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    await this.refreshTokenRepository.delete({ expires_at: LessThan(cutoff) });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.user_id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toSafeUser(user: User) {
    return {
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      emailVerified: user.email_verified,
      role: user.role,
      status: user.status,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
