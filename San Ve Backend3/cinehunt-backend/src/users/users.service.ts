import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

/** Role hợp lệ trong DB (SQL CHECK): CUSTOMER | STAFF | ADMIN */
export const DB_ROLES = ['CUSTOMER', 'STAFF', 'ADMIN'] as const;

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

  /**
   * FIX: Frontend (userApi.getAll) mong đợi shape { data, total, page, limit }.
   * Trước đây service trả về mảng thuần -> res.data === undefined -> AdminUsersPage
   * crash tại users.filter(). Nay trả đúng shape + hỗ trợ phân trang & tìm kiếm.
   */
  async getAllUsers(page = 1, limit = 20, search?: string) {
    try {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const qb = this.userRepo
        .createQueryBuilder('user')
        .orderBy('user.createdAt', 'DESC')
        .skip((safePage - 1) * safeLimit)
        .take(safeLimit);

      if (search?.trim()) {
        const keyword = `%${search.trim()}%`;
        qb.andWhere(
          new Brackets((w) => {
            w.where('user.fullName LIKE :keyword', { keyword })
              .orWhere('user.email LIKE :keyword', { keyword })
              .orWhere('user.phone LIKE :keyword', { keyword });
          }),
        );
      }

      const [users, total] = await qb.getManyAndCount();

      return {
        data: users.map((u) => this.toProfile(u)),
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
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
    const allowed = ['ACTIVE', 'BANNED', 'DELETED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Trạng thái không hợp lệ. Chỉ chấp nhận: ${allowed.join(', ')}`,
      );
    }
    try {
      const user = await this.userRepo.findOne({ where: { userId: targetId } });
      if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);
      user.status = status;
      await this.userRepo.save(user);
      return this.toProfile(user);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Không cập nhật được trạng thái người dùng');
    }
  }

  /**
   * FIX [Critical]: Frontend gọi PATCH /users/:id/role nhưng backend không có.
   * Frontend dùng nhãn 'USER', DB dùng 'CUSTOMER' -> chuẩn hoá 2 chiều tại đây.
   */
  async adminUpdateRole(targetId: number, role: string, actorId?: number) {
    const normalized = this.normalizeRole(role);

    if (actorId && actorId === targetId && normalized !== 'ADMIN') {
      throw new BadRequestException('Bạn không thể tự hạ quyền của chính mình');
    }

    const user = await this.userRepo.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);

    // Không cho phép hạ quyền admin cuối cùng của hệ thống
    if (user.role === 'ADMIN' && normalized !== 'ADMIN') {
      const adminCount = await this.userRepo.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Không thể hạ quyền admin cuối cùng của hệ thống',
        );
      }
    }

    user.role = normalized;
    await this.userRepo.save(user);
    return this.toProfile(user);
  }

  /** PUT /users/:id — admin sửa thông tin cơ bản của user */
  async adminUpdateUser(
    targetId: number,
    dto: { fullName?: string; phone?: string; role?: string; status?: string },
  ) {
    const user = await this.userRepo.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;
    if (dto.role !== undefined) user.role = this.normalizeRole(dto.role);
    if (dto.status !== undefined) user.status = dto.status;

    await this.userRepo.save(user);
    return this.toProfile(user);
  }

  /**
   * DELETE /users/:id — soft delete (status = DELETED).
   * Không xoá cứng vì user còn ràng buộc FK với booking_orders, payments...
   */
  async adminDeleteUser(targetId: number, actorId?: number) {
    if (actorId && actorId === targetId) {
      throw new BadRequestException('Bạn không thể tự xoá tài khoản của chính mình');
    }
    const user = await this.userRepo.findOne({ where: { userId: targetId } });
    if (!user) throw new NotFoundException(`User #${targetId} không tồn tại`);

    user.status = 'DELETED';
    await this.userRepo.save(user);
    return { success: true, message: `Đã vô hiệu hoá user #${targetId}` };
  }

  private normalizeRole(role: string): string {
    const value = String(role ?? '').trim().toUpperCase();
    // Frontend gửi 'USER', DB lưu 'CUSTOMER'
    const mapped = value === 'USER' ? 'CUSTOMER' : value;
    if (!DB_ROLES.includes(mapped as (typeof DB_ROLES)[number])) {
      throw new BadRequestException(
        `Role không hợp lệ. Chỉ chấp nhận: USER, CUSTOMER, STAFF, ADMIN`,
      );
    }
    return mapped;
  }

  private toProfile(user: User) {
    return {
      // FIX: Frontend dùng `user.id`, backend trả `userId` -> trả cả hai để tương thích
      id: user.userId,
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      role: user.role ?? null,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // passwordHash KHÔNG có trong toProfile — không bao giờ trả ra ngoài
    };
  }
}
