import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
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

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.userRepository.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      phone: dto.phone?.trim() || null,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerified: false,
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

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    user.lastLoginAt = new Date();
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
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    return this.toSafeUser(user);
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
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
