// src/database/entities/showtime.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Movie } from './movie.entity';
import { Room } from './room.entity';
import { ShowtimeSeat } from './showtime-seat.entity';
import { BookingOrder } from './booking-order.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn()
  showtime_id: number;

  @Column()
  movie_id: number;

  @Column()
  room_id: number;

  @Column({ type: 'datetime' })
  start_time: Date;

  @Column({ type: 'datetime' })
  end_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_price: number;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => ShowtimeSeat, seat => seat.showtime)
  showtimeSeats: ShowtimeSeat[];

  @OneToMany(() => BookingOrder, booking => booking.showtime)
  bookings: BookingOrder[];
}