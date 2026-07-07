import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Room } from './room.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn({ name: 'showtime_id' })
  showtime_id: number;

  @Column({ name: 'movie_id' })
  movie_id: number;

  @Column({ name: 'room_id' })
  room_id: number;

  @Column({ name: 'show_date', type: 'date' })
  show_date: string;

  @Column({ name: 'start_time', type: 'time' })
  start_time: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  end_time: string;

  // FIX: đổi name từ 'showtime_status' → 'status' để khớp với SQL
  @Column({ name: 'status', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  base_price: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Movie, (movie) => movie.showtimes)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => ShowtimeSeat, (ss) => ss.showtime)
  showtimeSeats: ShowtimeSeat[];
}
