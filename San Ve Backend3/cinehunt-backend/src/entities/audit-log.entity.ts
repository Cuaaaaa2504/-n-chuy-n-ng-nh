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
  @PrimaryGeneratedColumn({ name: 'audit_id', type: 'bigint' })
  audit_id: string;

  @Column({ name: 'user_id', nullable: true, type: 'int' })
  user_id: number | null;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 80 })
  entity_type: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 80, nullable: true })
  entity_id: string | null;

  @Column({ name: 'old_values', type: 'nvarchar', nullable: true })
  old_values: string | null;

  @Column({ name: 'new_values', type: 'nvarchar', nullable: true })
  new_values: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ name: 'user_agent', type: 'nvarchar', length: 500, nullable: true })
  user_agent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
