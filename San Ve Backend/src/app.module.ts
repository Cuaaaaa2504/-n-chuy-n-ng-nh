import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowtimesModule } from './showtimes/showtimes.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      username: 'nestapp',
      password: 'Namcua2504@',
      database: 'MovieTicketHuntingDB',
      autoLoadEntities: true,
      synchronize: false,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    }),
    ShowtimesModule,
  ],
})
export class AppModule {}
