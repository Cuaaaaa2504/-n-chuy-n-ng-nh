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
  @PrimaryGeneratedColumn()
  log_id: number;

  @Column({ name: 'user_id', nullable: true })
  user_id: number;

  @Column({ type: 'varchar', length: 50 })
  action: string; // LOGIN | LOGOUT | CREATE_BOOKING | CANCEL_BOOKING...

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_type: string; // booking | payment | user...

  @Column({ name: 'entity_id', nullable: true })
  entity_id: number;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ip_address: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
