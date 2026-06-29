import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BookingDetail } from './booking-detail.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  ticket_id: number;

  @Column({ name: 'booking_detail_id' })
  booking_detail_id: number;

  @Column({ name: 'ticket_code', type: 'varchar', length: 50, unique: true })
  ticket_code: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 255 })
  qr_code: string;

  @Column({ name: 'ticket_status', type: 'varchar', length: 20, default: 'VALID' })
  ticket_status: string;

  @CreateDateColumn({ name: 'issued_at' })
  issued_at: Date;

  @Column({ name: 'checked_in_at', type: 'datetime', nullable: true })
  checked_in_at: Date;

  @ManyToOne(() => BookingDetail)
  @JoinColumn({ name: 'booking_detail_id' })
  booking_detail: BookingDetail;
}