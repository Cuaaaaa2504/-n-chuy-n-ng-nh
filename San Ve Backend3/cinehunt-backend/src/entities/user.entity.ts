import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { SeatHold } from './seat-hold.entity';
import { TicketWatchRequest } from './ticket-watch-request.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ type: 'nvarchar', length: 100 })
  full_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string;

  @Column({ type: 'bit', default: false, name: 'email_verified' })
  email_verified: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'last_login_at' })
  last_login_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  // ── Refresh Token ────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'refresh_token_hash' })
  refresh_token_hash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => BookingOrder, (booking) => booking.user)
  bookings: BookingOrder[];

  @OneToMany(() => SeatHold, (hold) => hold.user)
  seat_holds: SeatHold[];

  @OneToMany(() => TicketWatchRequest, (request) => request.user)
  watch_requests: TicketWatchRequest[];
}
