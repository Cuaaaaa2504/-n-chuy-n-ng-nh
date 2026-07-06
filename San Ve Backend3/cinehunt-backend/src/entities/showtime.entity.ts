import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn({ type: 'int' })
  showtimeId: number;

  @Column({ type: 'int' })
  movieId: number;

  @Column({ type: 'int' })
  roomId: number;

  @Column({ type: 'datetime2', precision: 0 })
  startTime: Date;

  @Column({ type: 'datetime2', precision: 0 })
  endTime: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basePrice: number;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @Column({ type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => Movie)
  @JoinColumn()
  movie: Movie;

  @ManyToOne(() => Room)
  @JoinColumn()
  room: Room;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  creator: User | null;
}
