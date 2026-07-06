import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Maps to table `promotions` in DB schema.
 * Internally named Voucher to keep existing service/controller code intact.
 */
@Entity('promotions')
export class Voucher {
  @PrimaryGeneratedColumn({ type: 'int' })
  promotionId: number;

  /** Alias: service code dùng `voucher.voucherId` -> trỏ vào promotionId */
  get voucherId(): number { return this.promotionId; }

  @Column({ type: 'varchar', length: 50, unique: true })
  promotionCode: string;

  /** Alias: service code dùng `voucher.code` -> trỏ vào promotionCode */
  get code(): string { return this.promotionCode; }
  set code(v: string) { this.promotionCode = v; }

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
