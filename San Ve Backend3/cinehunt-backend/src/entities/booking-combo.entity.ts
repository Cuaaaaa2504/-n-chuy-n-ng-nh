import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_products')
export class BookingCombo {
  @PrimaryGeneratedColumn({ name: 'booking_product_id', type: 'bigint' })
  booking_product_id: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'product_id', type: 'int' })
  product_id: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @ManyToOne(() => BookingOrder, (booking) => booking.booking_products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'product_id' })
  product: ConcessionCombo;
}
