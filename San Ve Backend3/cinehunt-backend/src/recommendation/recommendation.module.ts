import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MovieModule } from '../movie/movie.module';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

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
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
