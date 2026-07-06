import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn({ type: 'int' })
  promotionId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  promotionCode: string;

  @Column({ type: 'nvarchar', length: 150 })
  promotionName: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  discountType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'datetime2', precision: 0 })
  startAt: Date;

  @Column({ type: 'datetime2', precision: 0 })
  endAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;
}
