import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConcessionComboService } from './concession-combo.service';
import { ConcessionCombo } from '../entities/concession-combo.entity';

@ApiTags('concession-combos')
@Controller('api/concession-combos')
export class ConcessionComboController {
  constructor(private readonly service: ConcessionComboService) {}

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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo combo mới (Admin)' })
  create(@Body() body: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    return this.service.create(body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật combo (Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<ConcessionCombo>,
  ): Promise<ConcessionCombo> {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ẩn combo (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
