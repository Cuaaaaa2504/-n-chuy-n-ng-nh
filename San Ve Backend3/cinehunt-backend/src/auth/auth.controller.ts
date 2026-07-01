import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Public ──────────────────────────────────────────────────────────────

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Profile bản thân ────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(user.userId, body);
  }

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.userId, body);
  }

  // ── ADMIN only ──────────────────────────────────────────────────────────

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async setUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'ACTIVE' | 'BANNED' | 'DELETED',
  ) {
    return this.authService.setUserStatus(id, status);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminOnly() {
    return { message: 'Bạn đang truy cập API chỉ dành cho ADMIN' };
  }

  @Get('staff-or-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffOrAdmin() {
    return { message: 'Bạn đang truy cập API dành cho STAFF hoặc ADMIN' };
  }
}
