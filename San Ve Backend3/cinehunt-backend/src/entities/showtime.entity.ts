import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn({ name: 'showtime_id', type: 'int' })
  showtime_id: number;

  @Column({ name: 'movie_id', type: 'int' })
  movie_id: number;

  @Column({ name: 'room_id', type: 'int' })
  room_id: number;

  @Column({ name: 'start_time', type: 'datetime2', precision: 0 })
  start_time: Date;

  @Column({ name: 'end_time', type: 'datetime2', precision: 0 })
  end_time: Date;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2 })
  base_price: number;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  created_by: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
