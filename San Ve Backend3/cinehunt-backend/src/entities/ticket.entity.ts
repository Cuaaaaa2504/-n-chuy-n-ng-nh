import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BookingDetail } from './booking-detail.entity';
import { User } from './user.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn({ name: 'ticket_id', type: 'bigint' })
  ticket_id: string;

  @Column({ name: 'booking_detail_id', type: 'bigint' })
  booking_detail_id: string;

  @Column({ name: 'ticket_code', type: 'varchar', length: 60, unique: true })
  ticket_code: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 500 })
  qr_code: string;

  @Column({ name: 'ticket_status', type: 'varchar', length: 20, default: 'VALID' })
  ticket_status: string;

  @Column({ name: 'issued_at', type: 'datetime2', precision: 0 })
  issued_at: Date;

  @Column({ name: 'checked_in_at', type: 'datetime2', precision: 0, nullable: true })
  checked_in_at: Date | null;

  @Column({ name: 'checked_in_by', type: 'int', nullable: true })
  checked_in_by: number | null;

  @OneToOne(() => BookingDetail, (bookingDetail) => bookingDetail.ticket)
  @JoinColumn({ name: 'booking_detail_id' })
  booking_detail: BookingDetail;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'checked_in_by' })
  checked_in_user: User | null;
}
