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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  auditId: string;

  @Column({ nullable: true, type: 'int' })
  userId: number | null;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 80 })
  entityType: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  entityId: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  oldValues: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  newValues: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user: User | null;
}
