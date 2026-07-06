import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ShowtimeSeat } from './showtime-seat.entity';
import { Ticket } from './ticket.entity';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  bookingDetailId: string;

  @Column({ type: 'bigint' })
  bookingId: string;

  @Column({ type: 'int' })
  showtimeSeatId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  seatPrice: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  booking: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn()
  showtimeSeat: ShowtimeSeat;

  @OneToOne(() => Ticket, (ticket) => ticket.bookingDetail)
  ticket: Ticket;
}
