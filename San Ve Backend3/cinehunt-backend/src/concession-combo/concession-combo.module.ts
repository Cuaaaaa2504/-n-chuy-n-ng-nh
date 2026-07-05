import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { ConcessionComboService } from './concession-combo.service';
import { ConcessionComboController } from './concession-combo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConcessionCombo])],
  controllers: [ConcessionComboController],
  providers: [ConcessionComboService],
  exports: [ConcessionComboService],
})
export class ConcessionComboModule {}
