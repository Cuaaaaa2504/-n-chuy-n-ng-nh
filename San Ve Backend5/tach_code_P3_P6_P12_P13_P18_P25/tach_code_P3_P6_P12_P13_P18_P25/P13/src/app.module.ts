import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesModule } from './movies/movies.module';

const dbType = process.env.DB_TYPE || 'sqlite';
const isSqlite = dbType === 'sqlite';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: (isSqlite ? 'better-sqlite3' : 'mysql') as any,
      host: isSqlite ? undefined : process.env.DB_HOST || 'localhost',
      port: isSqlite ? undefined : Number(process.env.DB_PORT) || 3306,
      username: isSqlite ? undefined : process.env.DB_USERNAME || 'root',
      password: isSqlite ? undefined : process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || (isSqlite ? 'p13.sqlite' : 'cinema_db'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
    } as any),
    MoviesModule,
  ],
})
export class AppModule {}
