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
import { BookingProduct } from './booking-product.entity';
import { Refund } from './refund.entity';

@Entity('booking_orders')
export class BookingOrder {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 40, unique: true })
  bookingCode: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'showtime_id', type: 'int' })
  showtimeId: number;

  @Column({ name: 'promotion_id', type: 'int', nullable: true })
  promotionId: number | null;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'product_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  productAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  // FIX: SQL dùng cột 'status' (không phải 'booking_status')
  @Column({ name: 'status', type: 'varchar', length: 30, default: 'PENDING_PAYMENT' })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'paid_at', type: 'datetime2', precision: 0, nullable: true })
  paidAt: Date | null;

  @Column({ name: 'issued_at', type: 'datetime2', precision: 0, nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime2', precision: 0, nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @OneToMany(() => BookingDetail, (detail) => detail.booking)
  bookingDetails: BookingDetail[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];

  @OneToMany(() => BookingCombo, (item) => item.booking)
  bookingCombos: BookingCombo[];

  @OneToMany(() => BookingProduct, (item) => item.booking)
  bookingProducts: BookingProduct[];

  @OneToMany(() => Refund, (refund) => refund.booking)
  refunds: Refund[];
}
