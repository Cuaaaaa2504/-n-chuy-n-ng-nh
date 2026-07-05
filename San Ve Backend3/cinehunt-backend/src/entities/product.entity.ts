import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingProduct } from './booking-product.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'int' })
  product_id: number;

  @Column({ name: 'product_name', type: 'nvarchar', length: 150 })
  product_name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'nvarchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'stock_quantity', type: 'int', nullable: true })
  stock_quantity: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string; // 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @OneToMany(() => BookingProduct, (bp) => bp.product)
  booking_products: BookingProduct[];
}
