import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @Column({ name: 'booking_id' })
  booking_id: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'transaction_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transaction_code: string;

  @Column({
    name: 'payment_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  payment_url: string;

  @Column({ name: 'provider_response', type: 'nvarchar', nullable: true })
  provider_response: string;

  @Column({
    name: 'failed_reason',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  failed_reason: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  payment_status: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paid_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;
}
