import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  movie_id: number;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', nullable: true })
  description: string;

  @Column({ name: 'duration_minutes' })
  duration_minutes: number;

  @Column({ name: 'age_rating', type: 'varchar', length: 10, nullable: true })
  age_rating: string;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  release_date: Date;

  @Column({ name: 'poster_url', type: 'varchar', length: 255, nullable: true })
  poster_url: string;

  @Column({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true })
  trailer_url: string;

  @Column({ type: 'varchar', length: 20, default: 'NOW_SHOWING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}