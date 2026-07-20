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

export enum SeatHoldStatus {
  ACTIVE = 'ACTIVE',
  CONVERTED = 'CONVERTED',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  RELEASED = 'RELEASED',
}

/**
 * Trạng thái phải khớp với CK_seat_holds_status trong SQL.
 */
export const SEAT_HOLD_STATUS = [
  'ACTIVE',
  'CONFIRMED',
  'EXPIRED',
  'CANCELLED',
] as const;

export type SeatHoldStatus = (typeof SEAT_HOLD_STATUS)[number];

@Entity('seat_holds')
export class SeatHold {
  // FIX [M-11]: holdId BIGINT → typed string để tránh mất an toàn số học
  // JS number chỉ an toàn đến 2^53-1, BIGINT DB có thể vượt qua ngưỡng đó
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'hold_id' })
  holdId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'showtime_seat_id', type: 'int' })
  showtimeSeatId: number;

  @Column({ name: 'hold_token', type: 'uniqueidentifier', default: () => 'NEWID()' })
  holdToken: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: SeatHoldStatus.ACTIVE,
  })
  status: SeatHoldStatus;

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
