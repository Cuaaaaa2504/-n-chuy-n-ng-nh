import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { RecommendationQueryDto } from './dto/recommendation.dto';
import { RecommendationService } from './recommendation.service';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
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
}
