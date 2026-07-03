import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ name: 'notification_id', type: 'bigint' })
  notification_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar' })
  message: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 30 })
  notification_type: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 30, nullable: true })
  reference_type: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 80, nullable: true })
  reference_id: string | null;

  @Column({ name: 'is_read', type: 'bit', default: false })
  is_read: boolean;

  @Column({ name: 'read_at', type: 'datetime2', precision: 0, nullable: true })
  read_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
