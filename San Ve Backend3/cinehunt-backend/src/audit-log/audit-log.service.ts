import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface LogDto {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logRepo: Repository<AuditLog>,
  ) {}

  async log(dto: LogDto) {
    const entry = this.logRepo.create({
      user_id: dto.userId ?? null,
      action: dto.action,
      entity_type: dto.entityType ?? null,
      entity_id: dto.entityId ?? null,
      old_values: dto.oldValues ?? null,
      new_values: dto.newValues ?? null,
      ip_address: dto.ipAddress ?? null,
      user_agent: dto.userAgent ?? null,
    });
    return this.logRepo.save(entry);
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.logRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      relations: ['user'],
    });
    return { page, limit, total, totalPages: Math.ceil(total / limit), items };
  }

  async findByUser(userId: number) {
    return this.logRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
