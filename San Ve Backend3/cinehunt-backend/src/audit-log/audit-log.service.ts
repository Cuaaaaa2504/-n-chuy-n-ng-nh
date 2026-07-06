import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: {
    userId?: number | null;
    action: string;
    targetType?: string;
    targetId?: string | null;
    details?: any;
    ipAddress?: string | null;
  }): Promise<AuditLog> {
    const entry = this.repo.create({
      userId: dto.userId ?? null,
      action: dto.action,
      targetType: dto.targetType ?? null,
      targetId: dto.targetId ?? null,
      details: dto.details ? JSON.stringify(dto.details) : null,
      ipAddress: dto.ipAddress ?? null,
    });
    return this.repo.save(entry);
  }

  findAll(): Promise<AuditLog[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findByUser(userId: number): Promise<AuditLog[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
