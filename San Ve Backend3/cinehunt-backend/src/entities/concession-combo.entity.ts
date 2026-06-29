import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('concession_combos')
export class ConcessionCombo {
  @PrimaryGeneratedColumn()
  combo_id: number;

  @Column({ name: 'combo_name', type: 'nvarchar', length: 150 })
  combo_name: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}