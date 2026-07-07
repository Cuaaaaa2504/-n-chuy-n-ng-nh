import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { BookingDetail } from './booking-detail.entity';
import { Payment } from './payment.entity';

@Entity('booking_orders')
export class BookingOrder {
  @PrimaryGeneratedColumn({ name: 'booking_id' })
  booking_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'showtime_id', nullable: true })
  showtime_id: number;

  // FIX: đổi name từ 'booking_status' → 'status' để khớp với SQL
  @Column({ name: 'status', length: 30, default: 'PENDING' })
  status: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  total_amount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  final_amount: number;

  @Column({ name: 'promotion_id', nullable: true })
  promotion_id: number;

  @Column({ name: 'notes', type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => BookingDetail, (bd) => bd.bookingOrder)
  bookingDetails: BookingDetail[];

  @OneToMany(() => Payment, (p) => p.bookingOrder)
  payments: Payment[];
}
