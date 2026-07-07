import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Showtime } from './showtime.entity';
import { Genre } from './genre.entity';

export enum MovieStatus {
  NOW_SHOWING = 'NOW_SHOWING',
  COMING_SOON = 'COMING_SOON',
  ENDED = 'ENDED',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id' })
  movieId: number;

  @Column({ name: 'title', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'age_rating', length: 10, nullable: true })
  ageRating: string | null;

  @Column({ name: 'poster_url', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ name: 'backdrop_url', length: 500, nullable: true })
  backdropUrl: string | null;

  @Column({ name: 'trailer_url', length: 500, nullable: true })
  trailerUrl: string | null;

  @Column({ name: 'language', length: 50, nullable: true })
  language: string | null;

  @Column({ name: 'director', length: 200, nullable: true })
  director: string | null;

  @Column({ name: 'cast_members', type: 'nvarchar', length: 'max', nullable: true })
  castMembers: string | null;

  @Column({ name: 'status', length: 20, default: MovieStatus.NOW_SHOWING, nullable: true })
  status: string | null;

  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, insert: false, update: false })
  updatedAt: Date | null;

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
