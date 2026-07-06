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
  @PrimaryGeneratedColumn({ type: 'int' })
  productId: number;

  @Column({ type: 'nvarchar', length: 150 })
  productName: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'int', nullable: true })
  stockQuantity: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @OneToMany(() => BookingProduct, (bp) => bp.product)
  bookingProducts: BookingProduct[];
}
