import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BookingOrder } from './booking-order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @Column()
  booking_id: number;

  @Column({ length: 30 })
  payment_method: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'PENDING', length: 20 })
  status: string;

  @Column({ nullable: true, length: 100 })
  transaction_id: string;

  @Column({ nullable: true, length: 100 })
  request_id: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  paid_at: Date;

  @Column({ nullable: true, type: 'nvarchar', length: 500 })
  failed_reason: string;

  @ManyToOne(() => BookingOrder, (booking) => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  booking_order: BookingOrder;
}
