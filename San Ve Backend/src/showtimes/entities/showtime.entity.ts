import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'showtimes' })
export class Showtime {
  @PrimaryGeneratedColumn({ name: 'showtime_id' })
  showtimeId!: number;

  @Column({ name: 'movie_id', type: 'int' })
  movieId!: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId!: number;

  @Column({ name: 'start_time', type: 'datetime' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'datetime' })
  endTime!: Date;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  basePrice!: number;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
