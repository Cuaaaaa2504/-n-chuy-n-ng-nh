import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingCombo } from './booking-combo.entity';

@Entity('concession_combos')
export class ConcessionCombo {
  @PrimaryGeneratedColumn({ name: 'combo_id', type: 'int' })
  combo_id: number;

  @Column({ name: 'combo_name', type: 'nvarchar', length: 150 })
  combo_name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'nvarchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @OneToMany(() => BookingCombo, (bc) => bc.combo)
  booking_combos: BookingCombo[];
}
