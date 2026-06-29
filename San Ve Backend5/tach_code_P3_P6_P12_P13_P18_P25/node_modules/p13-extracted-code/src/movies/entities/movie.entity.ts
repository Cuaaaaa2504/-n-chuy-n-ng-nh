import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MovieStatus {
  NOW_SHOWING = 'NOW_SHOWING',
  COMING_SOON = 'COMING_SOON',
  ENDED = 'ENDED',
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 150 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'genre', type: 'varchar', length: 100 })
  genre: string;

  @Column({ name: 'duration', type: 'int' })
  duration: number;

  @Column({ name: 'age_rating', type: 'varchar', length: 20 })
  ageRating: string;

  @Column({ name: 'poster_url', type: 'varchar', length: 255, nullable: true })
  posterUrl?: string;

  @Column({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true })
  trailerUrl?: string;

  @Column({ name: 'release_date', type: 'date' })
  releaseDate: Date;

  @Column({
    name: 'status',
    type: 'simple-enum',
    enum: MovieStatus,
    default: MovieStatus.COMING_SOON,
  })
  status: MovieStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
