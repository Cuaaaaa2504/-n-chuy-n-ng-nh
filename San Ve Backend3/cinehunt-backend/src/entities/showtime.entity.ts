import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Room } from './room.entity';
import { Movie } from './movie.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn({ type: 'int', name: 'showtime_id' })
  showtimeId: number;

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId: number;

  @Column({ name: 'start_time', type: 'datetime2', precision: 0 })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime2', precision: 0 })
  endTime: Date;

  // 'format' là reserved keyword trong SQL Server
  // Dùng [format] để TypeORM tự escape khi generate query
  @Column({ name: '[format]', type: 'varchar', length: 10, nullable: true })
  format: string | null;

  @Column({ name: '[status]', type: 'varchar', length: 20, default: 'SCHEDULED' })
  status: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @OneToMany(() => ShowtimeSeat, (ss) => ss.showtime)
  showtimeSeats: ShowtimeSeat[];
}
