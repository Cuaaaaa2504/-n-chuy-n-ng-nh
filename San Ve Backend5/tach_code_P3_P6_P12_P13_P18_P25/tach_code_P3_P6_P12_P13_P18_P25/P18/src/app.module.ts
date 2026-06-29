import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';

const dbType = process.env.DB_TYPE || 'sqlite';
const isSqlite = dbType === 'sqlite';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (isSqlite ? 'better-sqlite3' : 'mssql') as any,
      host: isSqlite ? undefined : process.env.DB_HOST || 'localhost',
      port: isSqlite ? undefined : Number(process.env.DB_PORT) || 1433,
      username: isSqlite ? undefined : process.env.DB_USERNAME || 'sa',
      password: isSqlite ? undefined : process.env.DB_PASSWORD || 'your_password',
      database: process.env.DB_DATABASE || (isSqlite ? 'p18.sqlite' : 'MovieTicketHuntingDB'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
      options: isSqlite
        ? undefined
        : {
            encrypt: false,
            trustServerCertificate: true,
          },
    } as any),
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
