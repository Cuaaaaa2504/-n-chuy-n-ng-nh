// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, status: 'ACTIVE' },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.userRepository.update(user.user_id, {
      last_login_at: new Date(),
    });

    const { password_hash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.user_id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async getUserById(userId: number) {
    return this.userRepository.findOne({
      where: { user_id: userId, status: 'ACTIVE' },
      select: ['user_id', 'full_name', 'email', 'phone', 'role', 'avatar_url'],
    });
  }
}