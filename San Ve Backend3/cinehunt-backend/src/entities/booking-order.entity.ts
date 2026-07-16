import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Showtime } from './showtime.entity';
import { BookingDetail } from './booking-detail.entity';
import { Payment } from './payment.entity';
import { BookingCombo } from './booking-combo.entity';
import { BookingProduct } from './booking-product.entity';
import { Voucher } from './voucher.entity';

@Entity('booking_orders')
export class BookingOrder {
  // SQL: booking_id BIGINT IDENTITY
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

  // SQL: subtotal_amount — tổng ghế trước giảm giá
  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  // SQL: product_amount — tổng combo/bắp nước
  @Column({ name: 'product_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  productAmount: number;

  // SQL: total_amount = subtotal - discount + product
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'PENDING_PAYMENT' })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'paid_at', type: 'datetime2', precision: 0, nullable: true })
  paidAt: Date | null;

  // SQL: issued_at — thời điểm xuất vé
  @Column({ name: 'issued_at', type: 'datetime2', precision: 0, nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime2', precision: 0, nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, select: false, insert: false, update: false })
  updatedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Showtime)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  // SQL: FK_booking_orders_promotion — promotion_id -> promotions(promotion_id)
  // Voucher là entity map tới bảng promotions
  @ManyToOne(() => Voucher, { nullable: true })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Voucher | null;

  @OneToMany(() => BookingDetail, (bd) => bd.bookingOrder)
  bookingDetails: BookingDetail[];

  @OneToMany(() => Payment, (p) => p.bookingOrder)
  payments: Payment[];

  @OneToMany(() => BookingCombo, (bc) => bc.bookingOrder)
  bookingCombos: BookingCombo[];

  @OneToMany(() => BookingProduct, (bp) => bp.booking)
  bookingProducts: BookingProduct[];
}
