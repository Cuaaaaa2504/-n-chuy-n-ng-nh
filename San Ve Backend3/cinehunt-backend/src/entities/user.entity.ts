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
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'nvarchar', length: 120 })
  full_name: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'refresh_token_hash' })
  refresh_token_hash: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true, name: 'avatar_url' })
  avatar_url: string | null;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  date_of_birth: string | null;

  @Column({ type: 'bit', default: false, name: 'email_verified' })
  email_verified: boolean;

  @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
  failed_login_attempts: number;

  @Column({ type: 'datetime2', precision: 0, nullable: true, name: 'locked_until' })
  locked_until: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @OneToMany(() => BookingOrder, (booking) => booking.user)
  bookings: BookingOrder[];

  @OneToMany(() => SeatHold, (hold) => hold.user)
  seat_holds: SeatHold[];

  @OneToMany(() => TicketWatchRequest, (request) => request.user)
  watch_requests: TicketWatchRequest[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  user_roles: UserRole[];
}
