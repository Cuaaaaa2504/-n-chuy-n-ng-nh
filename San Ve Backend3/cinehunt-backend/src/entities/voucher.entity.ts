import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ type: 'int', name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'promotion_name', type: 'nvarchar', length: 150 })
  promotionName: string;

  @Column({ name: 'promotion_code', type: 'varchar', length: 50, unique: true })
  promotionCode: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'discount_type', type: 'varchar', length: 10 })
  discountType: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderAmount: number | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'start_at', type: 'datetime2', precision: 0 })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime2', precision: 0 })
  endAt: Date;

  // FIX: SQL dùng cột 'status' (không phải 'voucher_status')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;
}
