import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ShowtimeSeat } from './showtime-seat.entity';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn()
  booking_detail_id: number;

  @Column()
  booking_id: number;

  @Column()
  showtime_seat_id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  seat_price: number;

  @Column({ nullable: true, length: 20 })
  ticket_code: string;

  @ManyToOne(() => BookingOrder, (booking) => booking.booking_details)
  @JoinColumn({ name: 'booking_id' })
  booking_order: BookingOrder;

  @ManyToOne(() => ShowtimeSeat)
  @JoinColumn({ name: 'showtime_seat_id' })
  showtime_seat: ShowtimeSeat;
}
