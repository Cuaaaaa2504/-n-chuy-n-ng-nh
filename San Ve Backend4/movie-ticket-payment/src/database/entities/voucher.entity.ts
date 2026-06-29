// src/database/entities/voucher.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  voucher_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  discount_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order_amount: number;

  @Column({ type: 'datetime' })
  start_at: Date;

  @Column({ type: 'datetime' })
  end_at: Date;

  @Column({ nullable: true })
  usage_limit: number;

  @Column({ default: 0 })
  used_count: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;
}