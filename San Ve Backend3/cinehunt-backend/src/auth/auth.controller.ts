import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  AUTH_THROTTLE,
  REFRESH_THROTTLE,
  SENSITIVE_THROTTLE,
} from '../common/constants/throttle.constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Siết chặt: 5 lần / 60s — chống spam tạo tài khoản ảo.
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Siết chặt: 5 lần / 60s — chống brute-force mật khẩu.
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  // FIX [#2]: /refresh được FE gọi TỰ ĐỘNG khi access token hết hạn
  // (silent refresh). User mở nhiều tab => nhiều request gần như đồng thời,
  // dễ đụng trần limit mặc định và văng 429 oan, khiến user bị đăng xuất
  // ngoài ý muốn. Vì vậy nới riêng cho route này (30 lần / 60s).
  @Throttle(REFRESH_THROTTLE)
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@CurrentUser() user: any) {
    return this.authService.refresh(user.userId, user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.authService.logout(user.userId, refreshToken);
  }

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

  // FIX [#2]: đổi mật khẩu là endpoint NHẠY CẢM (attacker cầm token bị lộ có
  // thể dò `currentPassword`). Siết còn 3 lần / 60s — chặt hơn cả login.
  @Throttle(SENSITIVE_THROTTLE)
  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.userId, body);
  }

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
