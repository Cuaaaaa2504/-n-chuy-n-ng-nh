import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { Product } from './product.entity';

@Entity('booking_products')
export class BookingProduct {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'booking_product_id' })
  bookingProductId: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  // SQL: total_price AS (CONVERT(..., quantity * unit_price)) PERSISTED — computed column
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    nullable: true,
  })
  totalPrice: number | null;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => Product, (product) => product.bookingProducts)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
