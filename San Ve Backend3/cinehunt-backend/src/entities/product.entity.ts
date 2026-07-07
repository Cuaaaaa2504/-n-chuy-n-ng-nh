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
  @PrimaryGeneratedColumn({ type: 'int', name: 'product_id' })
  productId: number;

  @Column({ name: 'product_name', type: 'nvarchar', length: 150 })
  productName: string;

  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'stock_quantity', type: 'int', nullable: true })
  stockQuantity: number | null;

  // SQL CHECK: ('ACTIVE','INACTIVE','OUT_OF_STOCK')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @OneToMany(() => BookingProduct, (bp) => bp.product)
  bookingProducts: BookingProduct[];
}
