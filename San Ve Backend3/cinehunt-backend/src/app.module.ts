import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BookingModule } from './booking/booking.module';
import { ShowtimeSeatsModule } from './showtime-seats/showtime-seats.module';
import { MovieModule } from './movie/movie.module';
import { RecommendationModule } from './recommendation/recommendation.module';
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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
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
        port: parseInt(configService.get<string>('DB_PORT') ?? '1433', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: false,
        synchronize: false,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          ...(configService.get<string>('DB_INSTANCE')
            ? { instanceName: configService.get<string>('DB_INSTANCE') }
            : {}),
        },
      }),
    }),
    BookingModule,
    ShowtimeSeatsModule,
    MovieModule,
    RecommendationModule,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
