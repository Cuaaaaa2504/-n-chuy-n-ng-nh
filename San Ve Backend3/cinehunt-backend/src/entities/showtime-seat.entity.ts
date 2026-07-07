import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryGeneratedColumn({ name: 'showtime_seat_id' })
  showtime_seat_id: number;

  @Column({ name: 'showtime_id' })
  showtime_id: number;

  @Column({ name: 'seat_id' })
  seat_id: number;

  // FIX: đổi name từ 'seat_status' → 'status' để khớp với cột status trong SQL
  @Column({ name: 'status', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ name: 'held_by_user_id', nullable: true })
  held_by_user_id: number;

  @Column({ name: 'hold_expires_at', type: 'datetime', nullable: true })
  hold_expires_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Showtime, (st) => st.showtimeSeats)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;
}
