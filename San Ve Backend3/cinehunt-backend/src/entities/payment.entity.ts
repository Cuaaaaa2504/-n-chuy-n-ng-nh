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
import { Refund } from './refund.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  paymentId: string;

  @Column({ type: 'bigint' })
  bookingId: string;

  @Column({ type: 'varchar', length: 30 })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  transactionCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  paymentStatus: string;

  @Column({ type: 'nvarchar', nullable: true })
  providerResponse: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  failedReason: string | null;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.payments)
  @JoinColumn()
  booking: BookingOrder;

  @OneToMany(() => Refund, (refund) => refund.payment)
  refunds: Refund[];
}
