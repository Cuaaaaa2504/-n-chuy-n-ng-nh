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

  @Column({ name: 'genre_name', type: 'nvarchar', length: 50 })
  genreName: string;

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[];
}
