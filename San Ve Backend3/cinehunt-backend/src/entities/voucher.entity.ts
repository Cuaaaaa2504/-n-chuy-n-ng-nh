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

  @Column({ name: 'promotion_name', type: 'nvarchar', length: 150 })
  promotionName: string;

  @Column({ name: 'promotion_code', type: 'varchar', length: 50, unique: true })
  promotionCode: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discountType: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number | null;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'start_at', type: 'datetime2', precision: 0 })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime2', precision: 0 })
  endAt: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, select: false, insert: false, update: false })
  updatedAt: Date | null;
}
