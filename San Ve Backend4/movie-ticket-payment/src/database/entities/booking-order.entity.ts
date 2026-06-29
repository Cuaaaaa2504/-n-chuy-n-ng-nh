// src/database/entities/booking-order.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';
import { Voucher } from './voucher.entity';
import { BookingDetail } from './booking-detail.entity';
import { Payment } from './payment.entity';
import { BookingCombo } from './booking-combo.entity';

@Entity('booking_orders')
export class BookingOrder {
  @PrimaryGeneratedColumn()
  booking_id: number;

  @Column()
  user_id: number;

  @Column()
  showtime_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  booking_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  final_amount: number;

  @Column({ nullable: true })
  voucher_id: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDING_PAYMENT' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
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

  @OneToMany(() => BookingDetail, detail => detail.booking)
  bookingDetails: BookingDetail[];

  @OneToMany(() => Payment, payment => payment.booking)
  payments: Payment[];

  @OneToMany(() => BookingCombo, combo => combo.booking)
  bookingCombos: BookingCombo[];
}