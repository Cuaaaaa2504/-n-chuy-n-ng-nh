import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { RecommendationService } from './recommendation.service';
import { Movie } from '../entities/movie.entity';
import { Genre } from '../entities/genre.entity';

/**
 * FIX #1 — HttpModule KHÔNG có sẵn, phải cài thêm package.
 *
 * Bản thiết kế viết "cần imports: [HttpModule] để inject HttpService" như thể
 * nó nằm sẵn trong NestJS. Không phải. `HttpModule` đến từ `@nestjs/axios`,
 * và cả `@nestjs/axios` lẫn `axios` đều KHÔNG có trong `package.json` hiện
 * tại của cinehunt-backend (đã kiểm tra: dependencies không hề nhắc tới).
 *
 * Chạy trước khi build, nếu không sẽ nhận:
 *   TS2307: Cannot find module '@nestjs/axios'
 *
 *   npm install @nestjs/axios@^3.1.3 axios@^1.7.9
 *
 * Lưu ý version: project đang dùng NestJS v10 (@nestjs/common ^10.4.15).
 * `@nestjs/axios` v4 yêu cầu NestJS v11 -> phải ghim v3, không dùng @latest.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, Genre]),
    ConfigModule,
    HttpModule.register({
      // Timeout thật sự được kiểm soát bằng rxjs timeout() trong
      // RecommendationService; giá trị này chỉ là lưới an toàn tầng axios.
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  controllers: [MovieController],
  providers: [MovieService, RecommendationService],
  exports: [MovieService, RecommendationService],
})
export class MovieModule {}
