// src/database/entities/ticket.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BookingDetail } from './booking-detail.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  ticket_id: number;

  @Column()
  booking_detail_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_code: string;

  @Column({ type: 'varchar', length: 255 })
  qr_code: string;

  @Column({ type: 'varchar', length: 20, default: 'VALID' })
  ticket_status: string;

  @CreateDateColumn()
  issued_at: Date;

  @Column({ type: 'datetime', nullable: true })
  checked_in_at: Date;

  @ManyToOne(() => BookingDetail)
  @JoinColumn({ name: 'booking_detail_id' })
  bookingDetail: BookingDetail;
}