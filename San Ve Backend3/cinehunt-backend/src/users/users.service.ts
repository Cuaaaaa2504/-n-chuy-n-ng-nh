import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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
    // FIX [M-15]: dùng addSelect để lấy passwordHash chỉ khi cần
    // Các query thông thường KHÔNG lấy passwordHash nhờ select:false trên entity
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.userId = :userId', { userId })
      .getOne();
    if (!user) throw new NotFoundException(`User #${userId} không tồn tại`);
    return user;
  }

  async getProfile(userId: number) {
    try {
      const user = await this.userRepo.findOne({ where: { userId } });
      if (!user) throw new NotFoundException('Không tìm thấy user');
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không tải được thông tin người dùng');
    }
  }

  async updateProfile(
    userId: number,
    dto: { fullName?: string; avatarUrl?: string },
  ) {
    try {
      const user = await this.userRepo.findOne({ where: { userId } });
      if (!user) throw new NotFoundException('Không tìm thấy user');
      if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
      if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl ?? null;
      await this.userRepo.save(user);
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được thông tin');
    }
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    try {
      const user = await this.findById(userId);
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid)
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await this.userRepo.save(user);
      return { message: 'Đổi mật khẩu thành công' };
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Không đổi được mật khẩu');
    }
  }

  async getAllUsers() {
    try {
      // FIX [M-15]: find() thông thường KHÔNG trả về passwordHash (select:false trên entity)
      const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
      return users.map((u) => this.toProfile(u));
    } catch {
      throw new InternalServerErrorException('Không tải được danh sách người dùng');
    }
  }

  listUsers() {
    return this.getAllUsers();
  }

  async getUserById(targetId: number) {
    try {
      const user = await this.userRepo.findOne({ where: { userId: targetId } });
      if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không tải được thông tin người dùng');
    }
  }

  adminGetUser(targetId: number) {
    return this.getUserById(targetId);
  }

  async setUserStatus(targetId: number, status: string) {
    try {
      const user = await this.userRepo.findOne({ where: { userId: targetId } });
      if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
      (user as any).status = status;
      await this.userRepo.save(user);
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được trạng thái người dùng');
    }
  }

  async adminUpdateRole(targetId: number, role: string) {
    try {
      const user = await this.userRepo.findOne({ where: { userId: targetId } });
      if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
      (user as any).role = role;
      await this.userRepo.save(user);
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được quyền người dùng');
    }
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
      // passwordHash KHÔNG có trong toProfile — không bao giờ trả ra ngoài
    };
  }
}
