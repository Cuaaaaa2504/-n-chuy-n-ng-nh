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
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'booking_detail_id' })
  bookingDetailId: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @Column({ name: 'showtime_seat_id', type: 'int' })
  showtimeSeatId: number;

  @Column({ name: 'seat_price', type: 'decimal', precision: 12, scale: 2 })
  seatPrice: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtimeSeat: ShowtimeSeat;

  @OneToOne(() => Ticket, (ticket) => ticket.bookingDetail)
  ticket: Ticket;
}
