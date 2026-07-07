import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';

@Entity('payments')
export class Payment {
  // SQL: payment_id BIGINT IDENTITY
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'payment_id' })
  paymentId: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  // SQL CHECK: ('MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK')
  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  paymentMethod: string;

  @Column({ name: 'provider', type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  // SQL: transaction_code (không phải transaction_id)
  @Column({ name: 'transaction_code', type: 'varchar', length: 150, nullable: true })
  transactionCode: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  requestId: string | null;

  // SQL: payment_status CHECK('PENDING','SUCCESS','FAILED','REFUNDED')
  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'PENDING' })
  paymentStatus: string;

  // SQL: provider_response NVARCHAR(MAX)
  @Column({ name: 'provider_response', type: 'nvarchar', nullable: true })
  providerResponse: string | null;

  @Column({ name: 'failed_reason', type: 'nvarchar', length: 500, nullable: true })
  failedReason: string | null;

  @Column({ name: 'paid_at', type: 'datetime2', precision: 0, nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => BookingOrder, (booking) => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  bookingOrder: BookingOrder;
}
