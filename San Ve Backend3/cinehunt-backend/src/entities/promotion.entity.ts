import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn({ name: 'promotion_id', type: 'int' })
  promotion_id: number;

  @Column({ name: 'promotion_code', type: 'varchar', length: 50, unique: true })
  promotion_code: string;

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
