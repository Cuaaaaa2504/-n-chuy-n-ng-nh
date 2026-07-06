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
  @PrimaryGeneratedColumn({ type: 'int' })
  comboId: number;

  @Column({ type: 'nvarchar', length: 150 })
  comboName: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @OneToMany(() => BookingCombo, (bc) => bc.combo)
  bookingCombos: BookingCombo[];
}
