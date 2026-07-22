import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BookingModule } from './booking/booking.module';
import { ShowtimeSeatsModule } from './showtime-seats/showtime-seats.module';
import { MovieModule } from './movie/movie.module';
import { GenreModule } from './genre/genre.module';
import { CinemaModule } from './cinema/cinema.module';
import { ConcessionComboModule } from './concession-combo/concession-combo.module';
import { PaymentModule } from './payment/payment.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VoucherModule } from './voucher/voucher.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationModule } from './notification/notification.module';
import { RefundModule } from './refund/refund.module';
import { TicketModule } from './ticket/ticket.module';
import { OtpCodeModule } from './otp-code/otp-code.module';
import { ShowtimeModule } from './showtime/showtime.module';
import { TicketWatchRequestModule } from './ticket-watch-request/ticket-watch-request.module';
import { ProductModule } from './product/product.module';
import { AdminModule } from './admin/admin.module';
import {
  THROTTLE_TTL,
  THROTTLE_LIMIT,
} from './common/constants/throttle.constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // FIX [#3]: Không hardcode ttl/limit nữa. Dùng forRootAsync + ConfigService
    // giống cách TypeOrmModule đang làm, để prod / staging / dev chỉ cần đổi
    // biến môi trường THROTTLE_TTL, THROTTLE_LIMIT trong .env là xong,
    // không phải sửa code rồi redeploy.
    //
    // Đây là "lưới an toàn" mặc định cho toàn app (mức nới rộng: 100 req/60s).
    // Các route nhạy cảm tự override chặt hơn bằng @Throttle() tại controller.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          // parseInt bắt buộc: process.env luôn trả về string
          ttl: parseInt(
            configService.get<string>('THROTTLE_TTL') ?? String(THROTTLE_TTL),
            10,
          ),
          limit: parseInt(
            configService.get<string>('THROTTLE_LIMIT') ??
              String(THROTTLE_LIMIT),
            10,
          ),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST'),
        // FIX: parseInt bắt buộc vì process.env luôn là string,
        // configService.get<number>() không tự ép kiểu
        port: parseInt(configService.get<string>('DB_PORT') ?? '1433', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        options: { encrypt: false },
      }),
    }),
    BookingModule,
    ShowtimeSeatsModule,
    MovieModule,
    GenreModule,
    CinemaModule,
    ConcessionComboModule,
    PaymentModule,
    UsersModule,
    AuthModule,
    VoucherModule,
    AuditLogModule,
    NotificationModule,
    RefundModule,
    TicketModule,
    OtpCodeModule,
    ShowtimeModule,
    TicketWatchRequestModule,
    ProductModule,
    AdminModule,
  ],
  providers: [
    // FIX [#1]: GIỮ guard toàn cục nhưng đổi hẳn ý đồ thiết kế.
    //
    // Trước đây: global limit rất chặt (20 req/60s) -> phải rải @SkipThrottle()
    // khắp controller để "gỡ" ra => thiết kế ngược, dễ bỏ sót.
    //
    // Bây giờ: global limit là lưới an toàn nới rộng (100 req/60s, cấu hình
    // qua .env) chống spam/DoS cho MỌI module — kể cả module viết sau này mà
    // lập trình viên quên đặt throttle. Route nào cần chặt hơn thì override
    // bằng @Throttle() ngay tại route đó (opt-in siết chặt), thay vì opt-out
    // bằng @SkipThrottle().
    //
    // => Toàn bộ @SkipThrottle() trong auth.controller.ts đã được gỡ bỏ.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
