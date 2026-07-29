import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { RecommendationQueryDto } from './dto/recommendation.dto';
import { RecommendationService } from './recommendation.service';
import { RecommendationScheduler } from './recommendation.scheduler';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly scheduler: RecommendationScheduler,
  ) {}

  @Get()
  getRecommendations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.userId,
      query.limit ?? 10,
    );
  }

  @Get('health')
  async health() {
    const payload = await this.scheduler.checkHealth(false);
    return {
      serviceReachable: payload !== null,
      ...this.scheduler.getLastHealth(),
    };
  }

  @Post('retrain')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  retrain(@CurrentUser() user: CurrentUserPayload) {
    return this.scheduler.triggerTraining(`manual:admin-${user.userId}`);
  }
}
