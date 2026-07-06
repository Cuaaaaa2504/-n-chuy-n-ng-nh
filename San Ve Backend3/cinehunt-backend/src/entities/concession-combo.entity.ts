import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('concession_combos')
export class ConcessionCombo {
  @PrimaryGeneratedColumn({ type: 'int', name: 'combo_id' })
  comboId: number;

  @Column({ name: 'name', type: 'nvarchar', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string | null;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;
}
