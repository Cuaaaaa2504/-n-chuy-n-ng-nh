import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import {
  AUTH_THROTTLE,
  REFRESH_THROTTLE,
} from '../common/constants/throttle.constants';

/**
 * FIX [Dọn dẹp endpoint trùng lặp — mục 1.1 → 1.6 của báo cáo]
 *
 * Controller này TRƯỚC ĐÂY còn 6 route trùng/thừa, nay đã bị gỡ bỏ:
 *
 *  | Route đã xoá                    | Route thay thế (duy nhất)          |
 *  |---------------------------------|------------------------------------|
 *  | PATCH /auth/me                  | PATCH /users/me                    |
 *  | POST  /auth/me/change-password  | POST  /users/me/change-password    |
 *  | GET   /auth/users               | GET   /users                       |
 *  | PATCH /auth/users/:id/status    | PATCH /users/:id/status            |
 *  | GET   /auth/admin-only          | (endpoint test — xoá hẳn)          |
 *  | GET   /auth/staff-or-admin      | (endpoint test — xoá hẳn)          |
 *
 * Lý do: mỗi chức năng chỉ nên có MỘT đường vào. Khi tồn tại 2–3 route cho cùng
 * một hành động, guard/validation/throttle rất dễ lệch nhau giữa các route và
 * kẻ tấn công sẽ chọn đúng route yếu nhất để đi (xem mục 1.2 của báo cáo).
 *
 * `AuthController` từ nay chỉ giữ đúng phạm vi của nó: đăng ký, đăng nhập,
 * refresh, logout và đọc phiên hiện tại. Mọi thao tác trên *tài nguyên user*
 * đều nằm ở `UsersController`.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

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

  /**
   * FIX [mục 2.1 — hai `getProfile` khác shape]:
   * `AuthService.getProfile()` (toSafeUser) và `UsersService.getProfile()`
   * (toProfile) trả về hai object KHÁC NHAU — `toProfile` có thêm field `id`
   * mà frontend đang đọc. Trước đây GET /auth/me dùng bản của AuthService còn
   * PATCH /users/me lại trả bản của UsersService, nên cùng một user sẽ có shape
   * khác nhau tuỳ endpoint.
   *
   * Nay GET /auth/me uỷ quyền thẳng cho UsersService -> chỉ còn MỘT nguồn sự
   * thật cho hồ sơ người dùng.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }
}
