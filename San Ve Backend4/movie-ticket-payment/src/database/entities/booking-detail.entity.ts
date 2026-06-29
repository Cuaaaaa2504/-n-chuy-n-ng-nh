// src/database/entities/booking-detail.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ShowtimeSeat } from './showtime-seat.entity';
import { Ticket } from './ticket.entity';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn()
  booking_detail_id: number;

  @Column()
  booking_id: number;

  @Column()
  showtime_seat_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  seat_price: number;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtimeSeat: ShowtimeSeat;

  @OneToOne(() => Ticket, ticket => ticket.bookingDetail)
  ticket: Ticket;
}