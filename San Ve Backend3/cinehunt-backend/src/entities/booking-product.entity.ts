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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  bookingProductId: string;

  @Column({ type: 'bigint' })
  bookingId: string;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

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

  @ManyToOne(() => BookingOrder, { onDelete: 'CASCADE' })
  @JoinColumn()
  booking: BookingOrder;

  @ManyToOne(() => Product, (product) => product.bookingProducts)
  @JoinColumn()
  product: Product;
}
