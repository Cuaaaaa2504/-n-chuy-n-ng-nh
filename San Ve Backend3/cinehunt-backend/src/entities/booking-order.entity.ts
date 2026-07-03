import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';
import { BookingDetail } from './booking-detail.entity';
import { Payment } from './payment.entity';
import { BookingCombo } from './booking-combo.entity';

@Entity('booking_orders')
export class BookingOrder {
  @PrimaryGeneratedColumn({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 40, unique: true })
  booking_code: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'showtime_id', type: 'int' })
  showtime_id: number;

  @Column({ name: 'promotion_id', type: 'int', nullable: true })
  promotion_id: number | null;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal_amount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ name: 'product_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  product_amount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDING_PAYMENT' })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotency_key: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0, nullable: true })
  expires_at: Date | null;

  @Column({ name: 'paid_at', type: 'datetime2', precision: 0, nullable: true })
  paid_at: Date | null;

  @Column({ name: 'issued_at', type: 'datetime2', precision: 0, nullable: true })
  issued_at: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime2', precision: 0, nullable: true })
  cancelled_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @OneToMany(() => BookingDetail, (detail) => detail.booking)
  booking_details: BookingDetail[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];

  @OneToMany(() => BookingCombo, (item) => item.booking)
  booking_products: BookingCombo[];
}
