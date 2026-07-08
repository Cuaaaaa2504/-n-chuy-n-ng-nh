import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Maps to dbo.promotions table
@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ name: 'promotion_id' })
  promotionId: number;

  // SQL: promotion_code VARCHAR(50) NOT NULL UNIQUE
  @Column({ name: 'promotion_code', type: 'varchar', length: 50, unique: true })
  promotionCode: string;

  // SQL: promotion_name NVARCHAR(150) NOT NULL
  @Column({ name: 'promotion_name', type: 'nvarchar', length: 150 })
  promotionName: string;

  // SQL: description NVARCHAR(500) NULL
  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  // SQL CHECK: ('PERCENT','FIXED')
  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discountType: string;

  // SQL: discount_value DECIMAL(12,2) — entity cũ dùng precision:10 sai
  @Column({ name: 'discount_value', type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  // SQL: max_discount DECIMAL(12,2) NULL — entity cũ dùng max_discount_amount (tên sai)
  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number | null;

  // SQL: min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0 — entity cũ nullable sai
  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  // SQL: start_at DATETIME2(0) NOT NULL — entity cũ dùng start_date DATE (tên và type sai)
  @Column({ name: 'start_at', type: 'datetime2', precision: 0 })
  startAt: Date;

  // SQL: end_at DATETIME2(0) NOT NULL — entity cũ dùng end_date DATE (tên và type sai)
  @Column({ name: 'end_at', type: 'datetime2', precision: 0 })
  endAt: Date;

  // SQL CHECK: ('ACTIVE','INACTIVE','EXPIRED')
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;
}
