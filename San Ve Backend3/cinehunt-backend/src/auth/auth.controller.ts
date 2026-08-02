import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from './decorators/current-user.decorator';
import {
  AUTH_THROTTLE,
  REFRESH_THROTTLE,
} from '../common/constants/throttle.constants';
import {
  extractRefreshTokenFromCookie,
  REFRESH_COOKIE_NAME,
} from './strategies/jwt-refresh.strategy';

function parseDurationMs(rawValue: string | undefined): number {
  const raw = (rawValue || '7d').trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)(d|h|m|w)?$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = (match[2] || 'd').toLowerCase();
  const units: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return Math.max(60_000, value * (units[unit] ?? units.d));
}

function refreshCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = process.env.REFRESH_COOKIE_SAME_SITE?.trim().toLowerCase();
  const sameSite: CookieOptions['sameSite'] =
    configured === 'none' || configured === 'strict' || configured === 'lax'
      ? configured
      : 'lax';

  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/auth',
    maxAge: parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN),
  };
}

function setRefreshCookie(response: Response, refreshToken: string): void {
  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions(),
  );
}

function clearRefreshCookie(response: Response): void {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  response.clearCookie(REFRESH_COOKIE_NAME, options);
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, {
      deviceInfo: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  @Throttle(REFRESH_THROTTLE)
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @CurrentUser() user: any,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      user.userId,
      user.refreshToken,
      {
        deviceInfo: request.headers['user-agent'],
        ipAddress: request.ip,
      },
    );

    setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body('refreshToken') bodyRefreshToken?: string,
  ) {
    const refreshToken =
      bodyRefreshToken || extractRefreshTokenFromCookie(request) || undefined;
    const result = await this.authService.logout(user.userId, refreshToken);
    clearRefreshCookie(response);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }
}
