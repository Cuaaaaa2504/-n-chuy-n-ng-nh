import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // FIX: SQL dùng cột 'status' — TypeORM tự động escape thành [status] khi query
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ name: 'held_by_user_id', type: 'int', nullable: true })
  heldByUserId: number | null;

  @Column({ name: 'hold_expires_at', type: 'datetime2', precision: 0, nullable: true })
  holdExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;
}
