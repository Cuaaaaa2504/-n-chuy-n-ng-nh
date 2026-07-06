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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  watchId: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  movieId: number;

  @Column({ type: 'int', nullable: true })
  cinemaId: number | null;

  @Column({ type: 'date', nullable: true })
  preferredDate: Date | null;

  @Column({ type: 'time', precision: 0, nullable: true })
  preferredTimeFrom: string | null;

  @Column({ type: 'time', precision: 0, nullable: true })
  preferredTimeTo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  preferredSeatType: string | null;

  @Column({ type: 'int', default: 1 })
  minSeats: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxPrice: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'int', nullable: true })
  matchedShowtimeId: number | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  matchedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Movie)
  @JoinColumn()
  movie: Movie;

  @ManyToOne(() => Cinema, { nullable: true })
  @JoinColumn()
  cinema: Cinema | null;

  @ManyToOne(() => Showtime, { nullable: true })
  @JoinColumn()
  matchedShowtime: Showtime | null;
}
