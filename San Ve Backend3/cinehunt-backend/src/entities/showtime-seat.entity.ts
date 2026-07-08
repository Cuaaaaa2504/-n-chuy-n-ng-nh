import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';

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

  // SQL CHECK: ('AVAILABLE','HELD','SOLD','BLOCKED')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ name: 'held_by_user_id', type: 'int', nullable: true })
  heldByUserId: number | null;

  // SQL: hold_expires_at DATETIME2(0)
  @Column({ name: 'hold_expires_at', type: 'datetime2', precision: 0, nullable: true })
  holdExpiresAt: Date | null;

  // row_version ROWVERSION — không map (TypeORM không hỗ trợ natively)
  // updated_at — không tồn tại trong bảng showtime_seats, không map

  @ManyToOne(() => Showtime, (st) => st.showtimeSeats)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;
}
