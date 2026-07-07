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
  @PrimaryGeneratedColumn({ type: 'int', name: 'movie_id' })
  movieId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  ageRating: string | null;

  @Column({ name: 'director', type: 'nvarchar', length: 100, nullable: true })
  director: string | null;

  // 'cast' là reserved keyword của SQL Server, TypeORM không tự escape nó.
  // FIX: đổi tên cột DB thành movie_cast (chạy SQL bên dưới), property giữ là movieCast.
  // SQL cần chạy 1 lần trong SSMS:
  // EXEC sp_rename 'movies.cast', 'movie_cast', 'COLUMN';
  @Column({ name: 'movie_cast', type: 'nvarchar', nullable: true })
  movieCast: string | null;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'poster_url', type: 'varchar', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ name: 'trailer_url', type: 'varchar', length: 500, nullable: true })
  trailerUrl: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: MovieStatus.COMING_SOON,
  })
  status: MovieStatus;

  @Column({ name: 'language', type: 'varchar', length: 20, nullable: true })
  language: string | null;

  @ManyToMany(() => Genre, (genre) => genre.movies, { cascade: true, eager: false })
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'movieId' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'genreId' },
  })
  genres: Genre[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;
}
