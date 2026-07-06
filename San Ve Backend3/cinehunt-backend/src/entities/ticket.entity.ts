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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  ticketId: string;

  @Column({ type: 'bigint' })
  bookingDetailId: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  ticketCode: string;

  @Column({ type: 'varchar', length: 500 })
  qrCode: string;

  @Column({ type: 'varchar', length: 20, default: 'VALID' })
  ticketStatus: string;

  @Column({ type: 'datetime2', precision: 0 })
  issuedAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'int', nullable: true })
  checkedInBy: number | null;

  @OneToOne(() => BookingDetail, (bookingDetail) => bookingDetail.ticket)
  @JoinColumn({ name: 'booking_detail_id' })
  bookingDetail: BookingDetail;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'checked_in_by' })
  checkedInUser: User | null;
}
