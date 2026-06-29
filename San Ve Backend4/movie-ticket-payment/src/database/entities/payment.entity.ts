// src/database/entities/payment.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BookingOrder } from './booking-order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @Column()
  booking_id: number;

  @Column({ type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_code: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  payment_url: string;

  @Column({ type: 'nvarchar', nullable: true })
  provider_response: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  failed_reason: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  payment_status: string;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;
}