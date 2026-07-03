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
  @PrimaryGeneratedColumn({ name: 'booking_detail_id', type: 'bigint' })
  booking_detail_id: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'showtime_seat_id', type: 'int' })
  showtime_seat_id: number;

  @Column({ name: 'seat_price', type: 'decimal', precision: 12, scale: 2 })
  seat_price: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.booking_details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtime_seat: ShowtimeSeat;

  @OneToOne(() => Ticket, (ticket) => ticket.booking_detail)
  ticket: Ticket;
}
