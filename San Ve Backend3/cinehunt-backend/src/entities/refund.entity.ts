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
  @PrimaryGeneratedColumn({ name: 'refund_id', type: 'bigint' })
  refund_id: string;

  @Column({ name: 'payment_id', type: 'bigint' })
  payment_id: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2 })
  refund_amount: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ name: 'provider_ref', type: 'varchar', length: 150, nullable: true })
  provider_ref: string | null;

  @Column({ name: 'refund_status', type: 'varchar', length: 20, default: 'PENDING' })
  refund_status: string; // 'PENDING' | 'SUCCESS' | 'FAILED'

  @CreateDateColumn({ name: 'requested_at', type: 'datetime2', precision: 0 })
  requested_at: Date;

  @Column({ name: 'completed_at', type: 'datetime2', precision: 0, nullable: true })
  completed_at: Date | null;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;
}
