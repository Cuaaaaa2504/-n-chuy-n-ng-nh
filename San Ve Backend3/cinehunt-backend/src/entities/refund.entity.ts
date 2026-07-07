import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { BookingOrder } from './booking-order.entity';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'refund_id' })
  refundId: string;

  @Column({ name: 'payment_id', type: 'bigint' })
  paymentId: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2 })
  refundAmount: number;

  @Column({ name: 'reason', type: 'nvarchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ name: 'provider_ref', type: 'varchar', length: 150, nullable: true })
  providerRef: string | null;

  @Column({ name: 'refund_status', type: 'varchar', length: 20, default: 'PENDING' })
  refundStatus: string;

  @CreateDateColumn({ name: 'requested_at', type: 'datetime2', precision: 0 })
  requestedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime2', precision: 0, nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;
}
