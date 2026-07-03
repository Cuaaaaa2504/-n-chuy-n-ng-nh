import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Genre } from './genre.entity';

export enum MovieStatus {
  COMING_SOON = 'COMING_SOON',
  NOW_SHOWING = 'NOW_SHOWING',
  ENDED = 'ENDED',
  HIDDEN = 'HIDDEN',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id', type: 'int' })
  movie_id: number;

  @Column({ name: 'title', type: 'nvarchar', length: 250 })
  title: string;

  @Column({ name: 'original_title', type: 'nvarchar', length: 250, nullable: true })
  original_title: string | null;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  duration_minutes: number;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  release_date: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  end_date: Date | null;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  age_rating: string | null;

  @Column({ name: 'director', type: 'nvarchar', length: 150, nullable: true })
  director: string | null;

  @Column({ name: 'actors', type: 'nvarchar', length: 1000, nullable: true })
  actors: string | null;

  @Column({ name: 'country', type: 'nvarchar', length: 100, nullable: true })
  country: string | null;

  @Column({ name: 'language', type: 'nvarchar', length: 100, nullable: true })
  language: string | null;

  @Column({ name: 'poster_url', type: 'nvarchar', length: 500, nullable: true })
  poster_url: string | null;

  @Column({ name: 'banner_url', type: 'nvarchar', length: 500, nullable: true })
  banner_url: string | null;

  @Column({ name: 'trailer_url', type: 'nvarchar', length: 500, nullable: true })
  trailer_url: string | null;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: MovieStatus.COMING_SOON,
  })
  status: MovieStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;

  @ManyToMany(() => Genre, (genre) => genre.movies, { eager: true })
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'movie_id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'genre_id' },
  })
  genres: Genre[];
}
