import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Showtime } from './showtime.entity';
import { Seat } from './seat.entity';
import { User } from './user.entity';

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryGeneratedColumn()
  showtime_seat_id: number;

  @Column({ name: 'showtime_id' })
  showtime_id: number;

  @Column({ name: 'seat_id' })
  seat_id: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'held_by_user_id', nullable: true })
  held_by_user_id: number;

  @Column({ name: 'hold_expires_at', type: 'datetime', nullable: true })
  hold_expires_at: Date;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Seat)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'held_by_user_id' })
  held_by_user: User;
}