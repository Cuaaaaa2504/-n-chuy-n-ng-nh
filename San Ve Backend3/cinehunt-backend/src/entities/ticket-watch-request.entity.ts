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
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'watch_id' })
  watchId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  @Column({ name: 'cinema_id', type: 'int', nullable: true })
  cinemaId: number | null;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferredDate: string | null;

  @Column({ name: 'preferred_time_from', type: 'time', precision: 0, nullable: true })
  preferredTimeFrom: string | null;

  @Column({ name: 'preferred_time_to', type: 'time', precision: 0, nullable: true })
  preferredTimeTo: string | null;

  // SQL CHECK: (NULL OR IN ('NORMAL','VIP','COUPLE'))
  @Column({ name: 'preferred_seat_type', type: 'varchar', length: 30, nullable: true })
  preferredSeatType: string | null;

  // SQL: seat_preference VARCHAR(20) NULL — thiếu hoàn toàn trong entity cũ
  @Column({ name: 'seat_preference', type: 'varchar', length: 20, nullable: true })
  seatPreference: string | null;

  // SQL: wants_combo BIT NOT NULL DEFAULT 0 — thiếu hoàn toàn trong entity cũ
  @Column({ name: 'wants_combo', type: 'bit', default: false })
  wantsCombo: boolean;

  // SQL: min_seats INT NOT NULL DEFAULT 1
  @Column({ name: 'min_seats', type: 'int', default: 1 })
  minSeats: number;

  @Column({ name: 'max_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxPrice: number | null;

  // SQL CHECK: ('ACTIVE','MATCHED','CANCELLED','EXPIRED')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'matched_showtime_id', type: 'int', nullable: true })
  matchedShowtimeId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'matched_at', type: 'datetime2', precision: 0, nullable: true })
  matchedAt: Date | null;

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
  matchedShowtime: Showtime | null;
}
