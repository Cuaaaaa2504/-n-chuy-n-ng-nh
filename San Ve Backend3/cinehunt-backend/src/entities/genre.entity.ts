import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Movie } from './movie.entity';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn({ type: 'int' })
  genreId: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  genreName: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  slug: string | null;

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[];
}
