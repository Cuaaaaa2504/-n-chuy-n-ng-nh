import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';
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

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  final_amount: number;

  @Column({ nullable: true })
  promotion_id: number;

  @Column({ nullable: true, type: 'nvarchar', length: 500 })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  expires_at: Date;

  @Column({ nullable: true, length: 50 })
  booking_code: string;

  @Column({ nullable: true })
  paid_at: Date;

  @Column({ nullable: true })
  cancelled_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @OneToMany(() => BookingDetail, (bd) => bd.booking_order)
  booking_details: BookingDetail[];

  @OneToMany(() => Payment, (p) => p.booking_order)
  payments: Payment[];

  @OneToMany(() => BookingCombo, (bc) => bc.booking_order)
  booking_combos: BookingCombo[];
}
