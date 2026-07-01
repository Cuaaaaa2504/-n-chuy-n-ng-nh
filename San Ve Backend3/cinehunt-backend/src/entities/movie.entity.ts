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
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id', type: 'int' })
  movie_id: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', length: 2000, nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  duration_minutes: number;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  age_rating: string | null;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  release_date: Date | null;

  @Column({ name: 'poster_url', type: 'varchar', length: 255, nullable: true })
  poster_url: string | null;

  @Column({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true })
  trailer_url: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: MovieStatus.NOW_SHOWING,
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
