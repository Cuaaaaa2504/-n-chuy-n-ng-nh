import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_combos')
export class BookingCombo {
  @PrimaryGeneratedColumn()
  booking_combo_id: number;

  @Column({ name: 'booking_id' })
  booking_id: number;

  @Column({ name: 'combo_id' })
  combo_id: number;

  @Column({ default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @ManyToOne(() => BookingOrder)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}