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
    entityType?: string | null;
    entityId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
  }): Promise<AuditLog> {
    const data: any = {
      userId: dto.userId ?? null,
      action: dto.action,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      oldValues: dto.oldValues ? JSON.stringify(dto.oldValues) : null,
      newValues: dto.newValues ? JSON.stringify(dto.newValues) : null,
      ipAddress: dto.ipAddress ?? null,
    };
    const entry = this.repo.create(data as unknown as AuditLog);
    return this.repo.save(entry);
  }

  findAll(page?: number, limit?: number): Promise<AuditLog[]> {
    const take = limit ?? 50;
    const skip = page && limit ? (page - 1) * limit : 0;
    return this.repo.find({
      order: { createdAt: 'DESC' } as any,
      take,
      skip,
    });
  }

  findByUser(userId: number): Promise<AuditLog[]> {
    return this.repo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }
}
