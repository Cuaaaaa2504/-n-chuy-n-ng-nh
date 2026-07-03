import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Movie } from './movie.entity';
import { Cinema } from './cinema.entity';
import { Showtime } from './showtime.entity';

@Entity('ticket_watch_requests')
export class TicketWatchRequest {
  @PrimaryGeneratedColumn({ name: 'watch_id', type: 'bigint' })
  watch_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'movie_id', type: 'int' })
  movie_id: number;

  @Column({ name: 'cinema_id', type: 'int', nullable: true })
  cinema_id: number | null;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferred_date: Date | null;

  @Column({ name: 'preferred_time_from', type: 'time', precision: 0, nullable: true })
  preferred_time_from: string | null;

  @Column({ name: 'preferred_time_to', type: 'time', precision: 0, nullable: true })
  preferred_time_to: string | null;

  @Column({ name: 'preferred_seat_type', type: 'varchar', length: 30, nullable: true })
  preferred_seat_type: string | null;

  @Column({ name: 'min_seats', type: 'int', default: 1 })
  min_seats: number;

  @Column({ name: 'max_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_price: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'matched_showtime_id', type: 'int', nullable: true })
  matched_showtime_id: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0, nullable: true })
  expires_at: Date | null;

  @Column({ name: 'matched_at', type: 'datetime2', precision: 0, nullable: true })
  matched_at: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Cinema, { nullable: true })
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema | null;

  @ManyToOne(() => Showtime, { nullable: true })
  @JoinColumn({ name: 'matched_showtime_id' })
  matched_showtime: Showtime | null;
}
