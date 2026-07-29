import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from '../movie/movie.module';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RecommendationScheduler } from './recommendation.scheduler';

@Module({
  imports: [
    ConfigModule,
    MovieModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  controllers: [RecommendationController],
  // FIX REC-05: đăng ký scheduler để @Cron() thật sự được Nest quét.
  // ScheduleModule.forRoot() ở AppModule chỉ bật cơ chế; không có provider nào
  // mang @Cron thì nó không làm gì cả — đúng tình trạng trước đây.
  providers: [RecommendationService, RecommendationScheduler],
  exports: [RecommendationService, RecommendationScheduler],
})
export class RecommendationModule {}
