import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConcessionCombo } from '../entities/concession-combo.entity';

@Injectable()
export class ConcessionComboService {
  constructor(
    @InjectRepository(ConcessionCombo)
    private readonly repo: Repository<ConcessionCombo>,
  ) {}

  findAll(): Promise<ConcessionCombo[]> {
    return this.repo.find({ where: { status: 'ACTIVE' }, order: { combo_id: 'ASC' } });
  }

  async findOne(id: number): Promise<ConcessionCombo> {
    const combo = await this.repo.findOne({ where: { combo_id: id } });
    if (!combo) throw new NotFoundException(`Combo #${id} không tồn tại`);
    return combo;
  }

  create(data: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.repo.update(id, { status: 'INACTIVE' });
  }
}
