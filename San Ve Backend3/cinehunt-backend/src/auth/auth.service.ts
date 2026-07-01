import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existedUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existedUser) {
      throw new BadRequestException('Email đã được sử dụng');
    }

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

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    user.last_login_at = new Date();
    await this.userRepository.save(user);

    const accessToken = await this.generateAccessToken(user);

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      tokenType: 'Bearer',
      user: this.toSafeUser(user),
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }
    return this.toSafeUser(user);
  }

  async updateProfile(
    userId: number,
    dto: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.fullName !== undefined) user.full_name = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() ?? null;
    if (dto.avatarUrl !== undefined) user.avatar_url = dto.avatarUrl ?? null;

    const updated = await this.userRepository.save(user);
    return {
      message: 'Cập nhật thông tin thành công',
      user: this.toSafeUser(updated),
    };
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu cũ');

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getAllUsers() {
    const users = await this.userRepository.find({
      order: { created_at: 'DESC' },
    });
    return users.map((u) => this.toSafeUser(u));
  }

  async setUserStatus(
    targetId: number,
    status: 'ACTIVE' | 'BANNED' | 'DELETED',
  ) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.status = status;
    await this.userRepository.save(user);

    return { message: `Đã cập nhật trạng thái người dùng thành ${status}` };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
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
