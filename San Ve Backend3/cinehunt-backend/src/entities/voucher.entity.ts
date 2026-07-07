import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ name: 'promotion_id' })
  promotion_id: number;

  @Column({ name: 'promotion_name', length: 150 })
  promotion_name: string;

  @Column({ name: 'promotion_code', length: 50, unique: true })
  promotion_code: string;

  @Column({ name: 'discount_type', length: 20 })
  discount_type: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_discount_amount: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order_amount: number;

  @Column({ name: 'usage_limit', nullable: true })
  usage_limit: number;

  @Column({ name: 'used_count', default: 0 })
  used_count: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  start_date: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  end_date: string;

  // FIX: đổi name từ 'voucher_status' → 'status' để khớp với SQL
  @Column({ name: 'status', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
