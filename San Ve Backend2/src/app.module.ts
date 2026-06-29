import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ShowtimeSeatsModule } from './showtime-seats/showtime-seats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 1433,
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'your_password',
      database: process.env.DB_DATABASE || 'MovieTicketHuntingDB',
      autoLoadEntities: true,
      synchronize: false,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    }),

    ScheduleModule.forRoot(),

    ShowtimeSeatsModule,
  ],
})
export class AppModule {}
