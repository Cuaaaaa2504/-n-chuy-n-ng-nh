import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return this.toSafeUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
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

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!isMatch)
      throw new BadRequestException('Mật khẩu hiện tại không đúng');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException(
        'Mật khẩu mới không được trùng mật khẩu cũ',
      );

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }

  // Chỉ ADMIN dùng
  async getAllUsers() {
    const users = await this.userRepository.find({
      order: { created_at: 'DESC' },
    });
    return users.map(this.toSafeUser);
  }

  async getUserById(targetId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return this.toSafeUser(user);
  }

  async setUserStatus(targetId: number, status: 'ACTIVE' | 'BANNED' | 'DELETED') {
    const user = await this.userRepository.findOne({
      where: { user_id: targetId },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.status = status;
    await this.userRepository.save(user);

    return { message: `Đã cập nhật trạng thái người dùng thành ${status}` };
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
