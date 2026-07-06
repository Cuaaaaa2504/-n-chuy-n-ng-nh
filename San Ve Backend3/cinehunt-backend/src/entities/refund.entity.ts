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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  refundId: string;

  @Column({ type: 'bigint' })
  paymentId: string;

  @Column({ type: 'bigint' })
  bookingId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  refundAmount: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  providerRef: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  refundStatus: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  requestedAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;
}
