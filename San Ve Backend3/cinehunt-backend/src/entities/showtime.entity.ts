import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Movie } from './movie.entity';
import { Room } from './room.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn()
  showtime_id: number;

  @Column({ name: 'movie_id' })
  movie_id: number;

  @Column({ name: 'room_id' })
  room_id: number;

  @Column({ name: 'start_time', type: 'datetime' })
  start_time: Date;

  @Column({ name: 'end_time', type: 'datetime' })
  end_time: Date;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  base_price: number;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;
}