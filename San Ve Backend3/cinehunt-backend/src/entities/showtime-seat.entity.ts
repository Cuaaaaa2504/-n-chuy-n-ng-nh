import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';

export const SHOWTIME_SEAT_STATUS = ['AVAILABLE', 'HELD', 'SOLD', 'BLOCKED'] as const;
export type ShowtimeSeatStatus = (typeof SHOWTIME_SEAT_STATUS)[number];

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryGeneratedColumn({ type: 'int', name: 'showtime_seat_id' })
  showtimeSeatId: number;

  @Column({ name: 'showtime_id', type: 'int' })
  showtimeId: number;

  @Column({ name: 'seat_id', type: 'int' })
  seatId: number;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: ShowtimeSeatStatus;

  @Column({ name: 'held_by_user_id', type: 'int', nullable: true })
  heldByUserId: number | null;

  @Column({ name: 'hold_expires_at', type: 'datetime2', precision: 0, nullable: true })
  holdExpiresAt: Date | null;


  @ManyToOne(() => Showtime, (st) => st.showtimeSeats)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;
}
