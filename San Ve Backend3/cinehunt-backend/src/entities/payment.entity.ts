import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { Refund } from './refund.entity';  // ← THÊM

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ name: 'payment_id', type: 'bigint' })
  payment_id: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_code', type: 'varchar', length: 150, nullable: true })
  transaction_code: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  request_id: string | null;

  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'PENDING' })
  payment_status: string;

  @Column({ name: 'provider_response', type: 'nvarchar', nullable: true })
  provider_response: string | null;

  @Column({ name: 'failed_reason', type: 'nvarchar', length: 500, nullable: true })
  failed_reason: string | null;  // ← THÊM (có trong DB nhưng thiếu trong entity cũ)

  @Column({ name: 'paid_at', type: 'datetime2', precision: 0, nullable: true })
  paid_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @OneToMany(() => Refund, (refund) => refund.payment)  // ← THÊM
  refunds: Refund[];
}
