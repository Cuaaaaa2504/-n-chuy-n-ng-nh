import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

@Entity('seat_holds')
export class SeatHold {
  @PrimaryGeneratedColumn({ name: 'hold_id', type: 'bigint' })
  hold_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'showtime_seat_id', type: 'int' })
  showtime_seat_id: number;

  @Column({ name: 'hold_token', type: 'uniqueidentifier' })
  hold_token: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expires_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @Column({ name: 'released_at', type: 'datetime2', precision: 0, nullable: true })
  released_at: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtime_seat: ShowtimeSeat;
}
