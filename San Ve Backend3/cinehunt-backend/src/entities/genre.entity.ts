import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Movie } from './movie.entity';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn({ name: 'genre_id', type: 'int' })
  genre_id: number;

  @Column({ name: 'genre_name', type: 'nvarchar', length: 100, unique: true })
  genre_name: string;

  @Column({ name: 'slug', type: 'varchar', length: 120, nullable: true, unique: true })
  slug: string | null;

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[];
}
