import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ShowtimeSeat } from './showtime-seat.entity';
import { Ticket } from './ticket.entity';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn()
  booking_detail_id: number;

  @Column({ name: 'booking_id' })
  booking_id: number;

  @Column({ name: 'showtime_seat_id' })
  showtime_seat_id: number;

  @Column({ name: 'seat_price', type: 'decimal', precision: 10, scale: 2 })
  seat_price: number;

  @ManyToOne(() => BookingOrder, booking => booking.booking_details)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtime_seat: ShowtimeSeat;

  @OneToOne(() => Ticket, ticket => ticket.booking_detail)
  ticket: Ticket;
}