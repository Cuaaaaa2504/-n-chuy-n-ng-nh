import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm';
import { Movie } from './movie.entity';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn({ type: 'int', name: 'genre_id' })
  genreId: number;

  @Column({ name: 'genre_name', type: 'nvarchar', length: 100 })
  genreName: string;

  @Column({ name: 'slug', type: 'varchar', length: 120, nullable: true })
  slug: string | null;

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[];
}
