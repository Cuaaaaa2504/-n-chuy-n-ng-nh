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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  notificationId: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar' })
  message: string;

  @Column({ type: 'varchar', length: 30 })
  notificationType: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  referenceId: string | null;

  @Column({ type: 'bit', default: false })
  isRead: boolean;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
