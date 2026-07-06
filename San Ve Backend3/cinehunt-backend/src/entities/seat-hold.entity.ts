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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  holdId: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  showtimeSeatId: number;

  @Column({ type: 'uniqueidentifier' })
  holdToken: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  releasedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtimeSeat: ShowtimeSeat;
}
