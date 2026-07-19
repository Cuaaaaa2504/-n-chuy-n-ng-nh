import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Tổng quan thống kê hệ thống' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Báo cáo doanh thu theo ngày/tháng/phim/rạp' })
  getRevenueReport(@Query() query: RevenueQueryDto) {
    return this.adminService.getRevenueReport(query);
  }
}
