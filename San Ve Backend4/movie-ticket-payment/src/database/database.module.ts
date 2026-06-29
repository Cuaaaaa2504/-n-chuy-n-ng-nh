import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '1433')),
        username: configService.get('DB_USER', 'sa'),
        password: configService.get('DB_PASSWORD', 'P@ssw0rd123'),
        database: configService.get('DB_NAME', 'MovieTicketHuntingDB'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}