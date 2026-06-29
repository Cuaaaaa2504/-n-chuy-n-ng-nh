// src/database/entities/seat-hold.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

@Entity('seat_holds')
export class SeatHold {
  @PrimaryGeneratedColumn()
  hold_id: number;

  @Column()
  user_id: number;

  @Column()
  showtime_seat_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  hold_token: string;

  @Column({ type: 'datetime' })
  expired_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtimeSeat: ShowtimeSeat;
}