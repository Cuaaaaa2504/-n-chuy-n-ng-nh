import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { detectAvatarExtension } from './avatar-file.util';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { SENSITIVE_THROTTLE } from '../common/constants/throttle.constants';

/** Thư mục lưu avatar — trùng với thư mục được serve static ở main.ts */
const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Profile của chính mình ─────────────────────────────────────────────
  /*
   * FIX [mục 2.1]: GET /users/me và GET /auth/me trước đây chạy HAI hàm khác
   * nhau (UsersService.getProfile vs AuthService.getProfile) và trả về hai
   * shape khác nhau. Nay AuthController uỷ quyền về đúng hàm dưới đây, nên hai
   * route trả kết quả GIỐNG HỆT nhau — giữ cả hai chỉ còn là alias vô hại,
   * không còn nguy cơ lệch dữ liệu khi debug.
   */
  @Get('me')
  getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get('me/membership')
  getMyMembership(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMembershipStats(user.userId);
  }

  /*
   * FIX [mục 1.2 + 2.2 — 3 route cho 1 chức năng đổi mật khẩu]
   *   - POST  /auth/me/change-password   (có @Throttle(SENSITIVE_THROTTLE))
   *   - POST  /users/me/change-password  (KHÔNG có throttle)  ← frontend gọi
   *   - PATCH /users/me/password         (KHÔNG có throttle)
   * Đây chính là lỗ hổng mô tả ở mục 1.2: rate-limit chỉ được gắn vào route
   * KHÔNG ai dùng, còn 2 route thật thì để trần. Kẻ tấn công cầm access token
   * bị lộ có thể brute-force `currentPassword` không giới hạn qua 2 route kia.
   * Nay chỉ còn DUY NHẤT route này, và throttle được chuyển về đúng chỗ.
   */
  @Throttle(SENSITIVE_THROTTLE)
  @Post('me/change-password')
  changeMyPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  /*
   * FIX [Critical]: route này trước đây KHÔNG tồn tại.
   * ProfilePage chọn ảnh -> userApi.uploadAvatar() POST multipart -> 404.
   */
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_AVATAR_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG, WEBP hoặc GIF'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không nhận được file ảnh');

    const extension = detectAvatarExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException('Nội dung file không phải ảnh JPEG, PNG, WEBP hoặc GIF hợp lệ');
    }

    await mkdir(AVATAR_DIR, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    const absolutePath = join(AVATAR_DIR, filename);
    const avatarUrl = `/uploads/avatars/${filename}`;

    await writeFile(absolutePath, file.buffer, { flag: 'wx' });
    try {
      await this.usersService.updateProfile(user.userId, { avatarUrl });
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }

    return { avatarUrl };
  }

  /*
   * FIX [Critical]: route + service method trước đây chưa được implement.
   * Frontend userApi.changeEmail() PATCH /users/me/email -> 404.
   */
  @Patch('me/email')
  changeMyEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangeEmailDto,
  ) {
    return this.usersService.changeEmail(user.userId, dto);
  }

  // ── ADMIN only ─────────────────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getAllUsers(@Query() query: QueryUsersDto) {
    return this.usersService.getAllUsers(query.page, query.limit, query.search);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  /*
   * FIX [Critical]: endpoint này trước đây KHÔNG tồn tại.
   * AdminUsersPage bấm "Cấp Admin / Hạ quyền" -> 404.
   */
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.usersService.adminUpdateRole(id, dto.role, actor.userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  setUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'ACTIVE' | 'BANNED' | 'DELETED',
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    if (actor.userId === id && status !== 'ACTIVE') {
      throw new BadRequestException('Bạn không thể tự khóa hoặc xóa tài khoản của chính mình');
    }
    return this.usersService.setUserStatus(id, status);
  }

  // Frontend userApi.update gọi PUT /users/:id — trước đây chưa có
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  // Frontend userApi.delete gọi DELETE /users/:id — trước đây chưa có
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.usersService.adminDeleteUser(id, actor.userId);
  }
}
