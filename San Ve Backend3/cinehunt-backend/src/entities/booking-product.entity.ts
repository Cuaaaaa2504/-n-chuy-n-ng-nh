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

  // total_price là computed column trong DB (quantity * unit_price PERSISTED)
  // TypeORM đọc được nhưng không ghi
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    nullable: true,
  })
  total_price: number | null;

  @ManyToOne(() => BookingOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => Product, (product) => product.booking_products)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
