import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Genre } from './genre.entity';

export enum MovieStatus {
  COMING_SOON = 'COMING_SOON',
  NOW_SHOWING = 'NOW_SHOWING',
  ENDED = 'ENDED',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id', type: 'int' })
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  ageRating: string | null;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'poster_url', type: 'varchar', length: 255, nullable: true })
  posterUrl: string | null;

  @Column({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true })
  trailerUrl: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: MovieStatus.NOW_SHOWING })
  status: MovieStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToMany(() => Genre, (genre) => genre.movies, { eager: true })
  @JoinTable({
    name: 'movie_genres',
    joinColumn: {
      name: 'movie_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'genre_id',
      referencedColumnName: 'id',
    },
  })
  genres: Genre[];
}
