import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'promotion_name', length: 150 })
  promotionName: string;

  @Column({ name: 'promotion_code', length: 50, unique: true })
  promotionCode: string;

  @Column({ name: 'discount_type', length: 20 })
  discountType: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  // SQL: max_discount_amount
  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount: number | null;

  @Column({ name: 'usage_limit', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  // SQL: start_date DATE
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startAt: string | null;

  // SQL: end_date DATE
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endAt: string | null;

  @Column({ name: 'status', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, insert: false, update: false })
  updatedAt: Date | null;
}
