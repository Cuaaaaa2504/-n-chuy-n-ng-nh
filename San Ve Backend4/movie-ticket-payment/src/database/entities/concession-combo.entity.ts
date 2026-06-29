// src/database/entities/concession-combo.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { BookingCombo } from './booking-combo.entity';

@Entity('concession_combos')
export class ConcessionCombo {
  @PrimaryGeneratedColumn()
  combo_id: number;

  @Column({ type: 'nvarchar', length: 150 })
  combo_name: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => BookingCombo, bookingCombo => bookingCombo.combo)
  bookingCombos: BookingCombo[];
}