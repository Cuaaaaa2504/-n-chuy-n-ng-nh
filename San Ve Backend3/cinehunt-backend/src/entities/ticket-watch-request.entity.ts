import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';

@Entity('ticket_watch_requests')
export class TicketWatchRequest {
  @PrimaryGeneratedColumn({ name: 'watch_request_id', type: 'bigint' })
  watch_request_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'showtime_id', type: 'int' })
  showtime_id: number;

  @Column({ name: 'desired_seat_count', type: 'int', default: 1 })
  desired_seat_count: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'notified_at', type: 'datetime2', precision: 0, nullable: true })
  notified_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;
}
