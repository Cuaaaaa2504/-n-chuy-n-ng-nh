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
  @PrimaryGeneratedColumn({ type: 'int', name: 'showtime_id' })
  showtimeId: number;

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId: number;

  // SQL: start_time DATETIME2(0) — full datetime, KHÔNG phải time-only
  // Bỏ show_date — cột này KHÔNG tồn tại trong SQL V6.3
  @Column({ name: 'start_time', type: 'datetime2', precision: 0 })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime2', precision: 0 })
  endTime: Date;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2 })
  basePrice: number;

  // SQL CHECK: status IN ('OPEN', 'CLOSED', 'CANCELLED')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => Movie, (movie) => movie.showtimes)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => ShowtimeSeat, (ss) => ss.showtime)
  showtimeSeats: ShowtimeSeat[];
}
