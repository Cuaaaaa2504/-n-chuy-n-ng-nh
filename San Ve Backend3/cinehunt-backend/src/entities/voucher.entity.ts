import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Maps to table `promotions` in V5 schema.
 * Internally named Voucher to keep existing service/controller code intact.
 * Column aliases bridge the old field names (code, voucher_id) to the actual DB columns.
 */
@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ name: 'promotion_id', type: 'int' })
  promotion_id: number;

  /** Alias: service code dùng `voucher.voucher_id` -> trỏ vào promotion_id */
  get voucher_id(): number { return this.promotion_id; }

  @Column({ name: 'promotion_code', type: 'varchar', length: 50, unique: true })
  promotion_code: string;

  /** Alias: service code dùng `voucher.code` -> trỏ vào promotion_code */
  get code(): string { return this.promotion_code; }
  set code(v: string) { this.promotion_code = v; }

  @Column({ name: 'promotion_name', type: 'nvarchar', length: 150 })
  promotion_name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discount_type: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 12, scale: 2 })
  discount_value: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_discount: number | null;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  min_order_amount: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usage_limit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  used_count: number;

  @Column({ name: 'start_at', type: 'datetime2', precision: 0 })
  start_at: Date;

  @Column({ name: 'end_at', type: 'datetime2', precision: 0 })
  end_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;
}
