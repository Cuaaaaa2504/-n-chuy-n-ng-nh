import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ name: 'notification_id', type: 'bigint' })
  notification_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', length: 1000 })
  message: string;

  @Column({ name: 'is_read', type: 'bit', default: false })
  is_read: boolean;

  @Column({ name: 'related_entity_type', type: 'varchar', length: 50, nullable: true })
  related_entity_type: string | null;

  @Column({ name: 'related_entity_id', type: 'varchar', length: 50, nullable: true })
  related_entity_id: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
