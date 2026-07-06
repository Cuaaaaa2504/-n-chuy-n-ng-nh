import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BookingDetail } from './booking-detail.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'ticket_id' })
  ticketId: string;

  @Column({ name: 'booking_detail_id', type: 'bigint', unique: true })
  bookingDetailId: string;

  @Column({ name: 'ticket_code', type: 'varchar', length: 40, unique: true })
  ticketCode: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 255, nullable: true })
  qrCode: string | null;

  @Column({ name: 'ticket_status', type: 'varchar', length: 20, default: 'VALID' })
  ticketStatus: string;

  @Column({ name: 'issued_at', type: 'datetime2', precision: 0, nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'checked_in_at', type: 'datetime2', precision: 0, nullable: true })
  checkedInAt: Date | null;

  @Column({ name: 'checked_in_by', type: 'int', nullable: true })
  checkedInBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @OneToOne(() => BookingDetail, (detail) => detail.ticket)
  @JoinColumn({ name: 'booking_detail_id' })
  bookingDetail: BookingDetail;
}
