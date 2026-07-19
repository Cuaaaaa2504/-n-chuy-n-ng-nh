import {
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
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Profile của chính mình ─────────────────────────────────────────────
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

  @Post('me/change-password')
  changeMyPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  // FIX: frontend userApi.changePassword gọi PATCH /users/me/password
  @Patch('me/password')
  changeMyPasswordAlias(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
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

  /**
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
  ) {
    return this.usersService.setUserStatus(id, status);
  }

  // FIX: frontend userApi.update gọi PUT /users/:id — trước đây chưa có
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  // FIX: frontend userApi.delete gọi DELETE /users/:id — trước đây chưa có
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
