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
  @PrimaryGeneratedColumn({ type: 'int' })
  showtimeSeatId: number;

  @Column({ type: 'int' })
  showtimeId: number;

  @Column({ type: 'int' })
  seatId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ type: 'int', nullable: true })
  heldByUserId: number | null;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  holdExpiresAt: Date | null;

  @Column({ name: 'row_version', type: 'rowversion', select: false, nullable: true })
  rowVersion?: Buffer;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'held_by_user_id' })
  heldByUser: User | null;
}
