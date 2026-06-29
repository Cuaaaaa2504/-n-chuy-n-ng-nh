// src/database/entities/movie.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Showtime } from './showtime.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  movie_id: number;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', nullable: true })
  description: string;

  @Column()
  duration_minutes: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  age_rating: string;

  @Column({ type: 'date', nullable: true })
  release_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  poster_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trailer_url: string;

  @Column({ type: 'varchar', length: 20, default: 'NOW_SHOWING' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Showtime, showtime => showtime.movie)
  showtimes: Showtime[];
}