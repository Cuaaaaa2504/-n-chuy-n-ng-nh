import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';
import { User } from './user.entity';

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryGeneratedColumn({ name: 'showtime_seat_id', type: 'int' })
  showtime_seat_id: number;

  @Column({ name: 'showtime_id', type: 'int' })
  showtime_id: number;

  @Column({ name: 'seat_id', type: 'int' })
  seat_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ name: 'held_by_user_id', type: 'int', nullable: true })
  held_by_user_id: number | null;

  @Column({ name: 'hold_expires_at', type: 'datetime2', precision: 0, nullable: true })
  hold_expires_at: Date | null;

  @Column({ name: 'row_version', type: 'timestamp', nullable: true, select: false })
  row_version?: Buffer;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'held_by_user_id' })
  held_by_user: User | null;
}
