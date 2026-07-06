import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ type: 'int', name: 'movie_id' })
  movieId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'duration', type: 'int', nullable: true })
  duration: number | null;

  @Column({ name: 'genre', type: 'nvarchar', length: 100, nullable: true })
  genre: string | null;

  @Column({ name: 'director', type: 'nvarchar', length: 100, nullable: true })
  director: string | null;

  @Column({ name: 'cast', type: 'nvarchar', nullable: true })
  cast: string | null;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'poster_url', type: 'varchar', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ name: 'trailer_url', type: 'varchar', length: 500, nullable: true })
  trailerUrl: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'COMING_SOON' })
  status: string;

  @Column({ name: 'rating', type: 'varchar', length: 10, nullable: true })
  rating: string | null;

  @Column({ name: 'language', type: 'varchar', length: 20, nullable: true })
  language: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;
}
