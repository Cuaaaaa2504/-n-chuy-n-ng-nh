import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  notification_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', length: 1000 })
  body: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  type: string; // BOOKING | PAYMENT | SYSTEM | PROMOTION

  @Column({ name: 'ref_id', nullable: true })
  ref_id: number; // booking_id, payment_id...

  @Column({ name: 'is_read', type: 'bit', default: false })
  is_read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
