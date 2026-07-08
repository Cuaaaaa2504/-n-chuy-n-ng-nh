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
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'notification_id' })
  notificationId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'message', type: 'nvarchar' })
  message: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 30 })
  notificationType: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 80, nullable: true })
  referenceId: string | null;

  @Column({ name: 'is_read', type: 'bit', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'datetime2', precision: 0, nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
