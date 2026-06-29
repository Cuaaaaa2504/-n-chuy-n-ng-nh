import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  voucher_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discount_type: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_discount: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order_amount: number;

  @Column({ name: 'start_at', type: 'datetime' })
  start_at: Date;

  @Column({ name: 'end_at', type: 'datetime' })
  end_at: Date;

  @Column({ name: 'usage_limit', nullable: true })
  usage_limit: number;

  @Column({ name: 'used_count', default: 0 })
  used_count: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;
}