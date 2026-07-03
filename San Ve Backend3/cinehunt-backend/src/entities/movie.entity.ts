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

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'movie_id', type: 'int' })
  movie_id: number;

  @Column({ type: 'nvarchar', length: 250 })
  title: string;

  @Column({ name: 'original_title', type: 'nvarchar', length: 250, nullable: true })
  original_title: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  duration_minutes: number;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  release_date: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  end_date: Date | null;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  age_rating: string | null;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  director: string | null;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  actors: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  language: string | null;

  @Column({ name: 'poster_url', type: 'nvarchar', length: 500, nullable: true })
  poster_url: string | null;

  @Column({ name: 'banner_url', type: 'nvarchar', length: 500, nullable: true })
  banner_url: string | null;

  @Column({ name: 'trailer_url', type: 'nvarchar', length: 500, nullable: true })
  trailer_url: string | null;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column({ type: 'varchar', length: 20, default: 'COMING_SOON' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @ManyToMany(() => Genre)
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'movie_id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'genre_id' },
  })
  genres: Genre[];
}
