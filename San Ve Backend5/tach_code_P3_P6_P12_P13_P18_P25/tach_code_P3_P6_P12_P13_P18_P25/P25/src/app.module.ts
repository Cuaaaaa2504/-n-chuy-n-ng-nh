import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesModule } from './movies/movies.module';

const dbType = process.env.DB_TYPE || 'sqlite';
const isSqlite = dbType === 'sqlite';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (isSqlite ? 'better-sqlite3' : 'mssql') as any,
      host: isSqlite ? undefined : process.env.DB_HOST || 'localhost',
      port: isSqlite ? undefined : Number(process.env.DB_PORT) || 1433,
      username: isSqlite ? undefined : process.env.DB_USERNAME || 'sa',
      password: isSqlite ? undefined : process.env.DB_PASSWORD || 'YourStrongPassword123',
      database: process.env.DB_DATABASE || (isSqlite ? 'p25.sqlite' : 'MovieTicketHuntingDB'),
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
    MoviesModule,
  ],
})
export class AppModule {}
