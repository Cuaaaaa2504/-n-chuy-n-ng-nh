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
  HIDDEN = 'HIDDEN',
}

export enum MovieAgeRating {
  P = 'P',
  K = 'K',
  T13 = 'T13',
  T16 = 'T16',
  T18 = 'T18',
  C = 'C',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id' })
  movieId: number;

  @Column({ name: 'title', length: 250 })
  title: string;

  @Column({ name: 'original_title', length: 250, nullable: true })
  originalTitle: string | null;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'age_rating', length: 10, nullable: true })
  ageRating: string | null;

  @Column({ name: 'director', length: 150, nullable: true })
  director: string | null;

  @Column({ name: 'actors', length: 1000, nullable: true })
  actors: string | null;

  @Column({ name: 'country', length: 100, nullable: true })
  country: string | null;

  @Column({ name: 'language', length: 100, nullable: true })
  language: string | null;

  @Column({ name: 'poster_url', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ name: 'banner_url', length: 500, nullable: true })
  bannerUrl: string | null;

  @Column({ name: 'trailer_url', length: 500, nullable: true })
  trailerUrl: string | null;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'status', length: 20, default: MovieStatus.COMING_SOON })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime2',
    precision: 0,
    nullable: true,
    select: false,
    insert: false,
    update: false,
  })
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
