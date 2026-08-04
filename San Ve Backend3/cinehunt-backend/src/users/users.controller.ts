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

  @Throttle(SENSITIVE_THROTTLE)
  @Post('me/change-password')
  changeMyPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

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

  @Patch('me/email')
  changeMyEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangeEmailDto,
  ) {
    return this.usersService.changeEmail(user.userId, dto);
  }

  // ADMIN only
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

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

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
