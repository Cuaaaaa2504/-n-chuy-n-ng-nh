import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';
import { Voucher } from './voucher.entity';
import { BookingDetail } from './booking-detail.entity';
import { Payment } from './payment.entity';

@Entity('booking_orders')
export class BookingOrder {
  @PrimaryGeneratedColumn()
  booking_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'showtime_id' })
  showtime_id: number;

  @Column({ name: 'booking_code', type: 'varchar', length: 50, unique: true })
  booking_code: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  final_amount: number;

  @Column({ name: 'voucher_id', nullable: true })
  voucher_id: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDING_PAYMENT' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'expired_at', type: 'datetime', nullable: true })
  expired_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @ManyToOne(() => Voucher)
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @OneToMany(() => BookingDetail, (detail) => detail.booking)
  booking_details: BookingDetail[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];
}