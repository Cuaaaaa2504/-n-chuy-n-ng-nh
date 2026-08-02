import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

export const REFRESH_COOKIE_NAME = 'cinehunt_refresh';

export function extractRefreshTokenFromCookie(
  request: Request | undefined,
): string | null {
  const header = request?.headers.cookie;
  if (!header) return null;

  for (const item of header.split(';')) {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (rawName !== REFRESH_COOKIE_NAME) continue;

    const value = rawValue.join('=');
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => extractRefreshTokenFromCookie(request),
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const refreshToken = extractRefreshTokenFromCookie(request);
    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
