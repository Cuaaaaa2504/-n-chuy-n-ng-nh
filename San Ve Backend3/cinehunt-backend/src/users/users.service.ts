import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException(`User #${userId} không tồn tại`);
    return user;
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Không tìm thấy user');
    return this.toProfile(user);
  }

  async updateProfile(userId: number, dto: { fullName?: string; avatarUrl?: string }) {
    const user = await this.findById(userId);
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl ?? null;
    await this.userRepo.save(user);
    return this.toProfile(user);
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Không tìm thấy user');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Đổi mật khẩu thành công' };
  }

  async listUsers() {
    return this.userRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async adminGetUser(targetId: number) {
    const user = await this.userRepo.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
    return this.toProfile(user);
  }

  async adminUpdateRole(targetId: number, role: string) {
    const user = await this.userRepo.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
    (user as any).role = role;
    await this.userRepo.save(user);
    return this.toProfile(user);
  }

  private toProfile(user: User) {
    return {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      phone: (user as any).phone ?? null,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      role: (user as any).role ?? null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
