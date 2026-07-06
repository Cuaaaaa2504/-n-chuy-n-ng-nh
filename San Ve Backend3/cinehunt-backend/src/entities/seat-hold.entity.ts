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
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'hold_id' })
  holdId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'showtime_seat_id', type: 'int' })
  showtimeSeatId: number;

  @Column({ name: 'hold_token', type: 'uniqueidentifier', default: () => 'NEWID()' })
  holdToken: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'released_at', type: 'datetime2', precision: 0, nullable: true })
  releasedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtimeSeat: ShowtimeSeat;
}
