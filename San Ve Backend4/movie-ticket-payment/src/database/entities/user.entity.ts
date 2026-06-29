// src/database/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { RefreshToken } from './refresh-token.entity';
import { SeatHold } from './seat-hold.entity';
import { TicketWatchRequest } from './ticket-watch-request.entity';
import { Notification } from './notification.entity';
import { AuditLog } from './audit-log.entity';

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

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string;

  @Column({ type: 'bit', default: false })
  email_verified: boolean;

  @Column({ type: 'datetime', nullable: true })
  last_login_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BookingOrder, booking => booking.user)
  bookings: BookingOrder[];

  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => SeatHold, hold => hold.user)
  seatHolds: SeatHold[];

  @OneToMany(() => TicketWatchRequest, watch => watch.user)
  watchRequests: TicketWatchRequest[];
}