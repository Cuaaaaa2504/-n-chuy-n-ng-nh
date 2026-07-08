import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'audit_id' })
  auditId: string;

  @Column({ name: 'user_id', nullable: true, type: 'int' })
  userId: number | null;

  @Column({ name: 'action', type: 'varchar', length: 80 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 80, nullable: true })
  entityId: string | null;

  @Column({ name: 'old_values', type: 'nvarchar', nullable: true })
  oldValues: string | null;

  @Column({ name: 'new_values', type: 'nvarchar', nullable: true })
  newValues: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'nvarchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
