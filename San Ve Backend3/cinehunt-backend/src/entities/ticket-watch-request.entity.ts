import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Movie } from './movie.entity';
import { Cinema } from './cinema.entity';

@Entity('ticket_watch_requests')
export class TicketWatchRequest {
  @PrimaryGeneratedColumn()
  watch_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'movie_id' })
  movie_id: number;

  @Column({ name: 'cinema_id', nullable: true })
  cinema_id: number;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferred_date: Date;

  @Column({ name: 'preferred_time_from', type: 'time', nullable: true })
  preferred_time_from: string;

  @Column({ name: 'preferred_time_to', type: 'time', nullable: true })
  preferred_time_to: string;

  @Column({ name: 'preferred_seat_type', type: 'varchar', length: 20, nullable: true })
  preferred_seat_type: string;

  @Column({ name: 'seat_preference', type: 'varchar', length: 20, nullable: true })
  seat_preference: string;

  @Column({ name: 'ticket_quantity', default: 1 })
  ticket_quantity: number;

  @Column({ name: 'max_budget', type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_budget: number;

  @Column({ name: 'wants_combo', type: 'bit', default: false })
  wants_combo: boolean;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Cinema)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;
}