import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã được đăng ký');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      full_name: registerDto.fullName,
      email: registerDto.email,
      phone: registerDto.phone,
      password_hash: hashedPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      email_verified: false,
    });

    const savedUser = await this.userRepository.save(user);

    const payload = { sub: savedUser.user_id, email: savedUser.email, role: savedUser.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        userId: savedUser.user_id,
        fullName: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Cập nhật last login
    await this.userRepository.update(user.user_id, {
      last_login_at: new Date(),
    });

    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId, status: 'ACTIVE' },
    });

    if (!user) {
      throw new UnauthorizedException('User không hợp lệ');
    }

    return user;
  }
}