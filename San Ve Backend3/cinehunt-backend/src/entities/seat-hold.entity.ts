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

/**
 * Trạng thái của bản ghi seat_holds.
 * FIX: trước đây file này khai báo TRÙNG tên `enum SeatHoldStatus` và
 * `type SeatHoldStatus` -> TS2567. Nay chỉ giữ DUY NHẤT enum làm nguồn sự thật.
 *
 * Danh sách phải khớp với CK_seat_holds_status trong SQL:
 *   CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CONVERTED', 'EXPIRED', 'CANCELLED'))
 * Vì vậy giá trị 'RELEASED' (không có trong DB) đã bị loại bỏ.
 */
export enum SeatHoldStatus {
  ACTIVE = 'ACTIVE',
  CONFIRMED = 'CONFIRMED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/** Mảng giá trị hợp lệ, dùng cho validation (class-validator @IsIn, ...). */
export const SEAT_HOLD_STATUS: readonly SeatHoldStatus[] =
  Object.values(SeatHoldStatus);

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
