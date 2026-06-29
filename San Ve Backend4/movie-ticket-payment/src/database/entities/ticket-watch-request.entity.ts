// src/database/entities/ticket-watch-request.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Movie } from './movie.entity';
import { Cinema } from './cinema.entity';

@Entity('ticket_watch_requests')
export class TicketWatchRequest {
  @PrimaryGeneratedColumn()
  watch_id: number;

  @Column()
  user_id: number;

  @Column()
  movie_id: number;

  @Column({ nullable: true })
  cinema_id: number;

  @Column({ type: 'date', nullable: true })
  preferred_date: Date;

  @Column({ type: 'time', nullable: true })
  preferred_time_from: string;

  @Column({ type: 'time', nullable: true })
  preferred_time_to: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  preferred_seat_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  seat_preference: string;

  @Column({ default: 1 })
  ticket_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_budget: number;

  @Column({ type: 'bit', default: false })
  wants_combo: boolean;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
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