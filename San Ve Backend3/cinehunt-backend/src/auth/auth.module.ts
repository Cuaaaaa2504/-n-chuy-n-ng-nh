import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

// GHI CHÚ [#4] — KHÔNG cần import ThrottlerModule ở đây.
//
// Báo cáo lỗi cho rằng phải import `ThrottlerModule` vào AuthModule thì
// @Throttle() mới có hiệu lực khi bỏ global guard. Điều này KHÔNG đúng với
// @nestjs/throttler v6 (bản đang dùng: ^6.5.0).
//
// Lý do: class `ThrottlerModule` được đánh dấu @Global() trong source của thư
// viện, nên chỉ cần gọi `ThrottlerModule.forRootAsync()` MỘT LẦN ở AppModule
// là THROTTLER_OPTIONS + ThrottlerStorage đã có mặt trên toàn app. Mọi module
// con đều resolve được ThrottlerGuard.
//
// Ngược lại, nếu import thêm `ThrottlerModule` (class trần, không kèm
// .forRoot) vào đây sẽ tạo ra một module RỖNG không export provider nào —
// vô nghĩa và gây hiểu nhầm. Vì vậy cố tình không thêm.
//
// Nếu sau này muốn bỏ global guard ở AppModule: chỉ cần thêm
// `@UseGuards(ThrottlerGuard)` lên AuthController là chạy, không cần import gì.
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    // FIX [mục 2.1]: GET /auth/me nay uỷ quyền cho UsersService để chỉ còn MỘT
    // implementation của "hồ sơ người dùng". UsersModule KHÔNG import AuthModule
    // nên không tạo circular dependency.
    UsersModule,
    // FIX [M-01]: Đổi JwtModule.register({}) rỗng sang registerAsync để inject
    // JWT_SECRET và JWT_EXPIRES_IN từ ConfigService — tránh lỗi "secretOrPrivateKey must have a value"
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
