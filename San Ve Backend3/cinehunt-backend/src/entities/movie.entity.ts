import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Genre } from './genre.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id' })
  movie_id: number;

  @Column({ name: 'title', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @Column({ name: 'duration_minutes', nullable: true })
  duration_minutes: number;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  release_date: string;

  @Column({ name: 'age_rating', length: 10, nullable: true })
  age_rating: string;

  @Column({ name: 'poster_url', length: 500, nullable: true })
  poster_url: string;

  @Column({ name: 'backdrop_url', length: 500, nullable: true })
  backdrop_url: string;

  @Column({ name: 'trailer_url', length: 500, nullable: true })
  trailer_url: string;

  @Column({ name: 'language', length: 50, nullable: true })
  language: string;

  @Column({ name: 'director', length: 200, nullable: true })
  director: string;

  // FIX: đổi name từ 'movie_cast' → 'cast_members' để khớp với SQL (cột cast_members)
  @Column({ name: 'cast_members', type: 'nvarchar', length: 'max', nullable: true })
  cast_members: string;

  @Column({ name: 'status', length: 20, default: 'NOW_SHOWING', nullable: true })
  status: string;

  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => Showtime, (s) => s.movie)
  showtimes: Showtime[];

  @ManyToMany(() => Genre)
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id' },
    inverseJoinColumn: { name: 'genre_id' },
  })
  genres: Genre[];
}
