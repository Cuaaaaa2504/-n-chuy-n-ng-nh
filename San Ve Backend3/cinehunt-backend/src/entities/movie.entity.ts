import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Genre } from './genre.entity';

export enum MovieStatus {
  COMING_SOON = 'COMING_SOON',
  NOW_SHOWING = 'NOW_SHOWING',
  ENDED = 'ENDED',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ type: 'int' })
  movieId: number;

  @Column({ type: 'nvarchar', length: 250 })
  title: string;

  @Column({ type: 'nvarchar', length: 250, nullable: true })
  originalTitle: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  ageRating: string | null;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  director: string | null;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  actors: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  language: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  trailerUrl: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'varchar', length: 20, default: MovieStatus.COMING_SOON })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToMany(() => Genre)
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'movieId' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'genreId' },
  })
  genres: Genre[];
}
