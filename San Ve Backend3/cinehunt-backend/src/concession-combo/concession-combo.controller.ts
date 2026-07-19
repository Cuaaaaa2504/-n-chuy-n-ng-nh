import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConcessionComboService } from './concession-combo.service';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('concession-combos')
// FIX: bỏ prefix 'api/' — app không có global prefix nên route cũ là
// /api/concession-combos trong khi mọi module khác dùng /concession-combos.
@Controller('concession-combos')
export class ConcessionComboController {
  constructor(private readonly service: ConcessionComboService) {}

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách combo kể cả đã ẩn (Admin)' })
  adminFindAll(): Promise<ConcessionCombo[]> {
    return this.service.adminFindAll();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách combo bắp nước' })
  findAll(): Promise<ConcessionCombo[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết combo' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ConcessionCombo> {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo combo mới (Admin)' })
  create(@Body() body: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật combo (Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<ConcessionCombo>,
  ): Promise<ConcessionCombo> {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ẩn combo (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
