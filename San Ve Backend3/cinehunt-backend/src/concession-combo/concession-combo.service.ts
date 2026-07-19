import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConcessionCombo } from '../entities/concession-combo.entity';

@Injectable()
export class ConcessionComboService {
  constructor(
    @InjectRepository(ConcessionCombo)
    private readonly repo: Repository<ConcessionCombo>,
  ) {}

  async findAll(): Promise<ConcessionCombo[]> {
    try {
      return await this.repo.find({
        where: { status: 'ACTIVE' },
        order: { comboId: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Không tải được danh sách combo');
    }
  }

  /** Admin cần thấy cả combo đã ẩn */
  adminFindAll(): Promise<ConcessionCombo[]> {
    return this.repo.find({ order: { comboId: 'ASC' } });
  }

  async findOne(id: number): Promise<ConcessionCombo> {
    try {
      const combo = await this.repo.findOne({ where: { comboId: id } });
      if (!combo) throw new NotFoundException(`Combo #${id} không tồn tại`);
      return combo;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không tải được thông tin combo');
    }
  }

  async create(data: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (err: any) {
      // SQL Server unique constraint violation: error number 2627 hoặc 2601
      if (err?.number === 2627 || err?.number === 2601 || err?.code === '23505') {
        throw new ConflictException('Combo đã tồn tại');
      }
      throw new InternalServerErrorException('Không tạo được combo');
    }
  }

  async update(id: number, data: Partial<ConcessionCombo>): Promise<ConcessionCombo> {
    try {
      await this.findOne(id);
      await this.repo.update({ comboId: id }, data);
      return this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không cập nhật được combo');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.findOne(id);
      await this.repo.update({ comboId: id }, { status: 'INACTIVE' });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Không xóa được combo');
    }
  }
}
