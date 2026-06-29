// src/database/entities/showtime-seat.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';
import { User } from './user.entity';

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryGeneratedColumn()
  showtime_seat_id: number;

  @Column()
  showtime_id: number;

  @Column()
  seat_id: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  held_by_user_id: number;

  @Column({ type: 'datetime', nullable: true })
  hold_expires_at: Date;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'held_by_user_id' })
  heldByUser: User;
}