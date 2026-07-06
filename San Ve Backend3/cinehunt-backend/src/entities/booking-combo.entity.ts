import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_combos')
export class BookingCombo {
  @PrimaryGeneratedColumn({ type: 'int', name: 'booking_combo_id' })
  bookingComboId: number;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @Column({ name: 'combo_id', type: 'int' })
  comboId: number;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingCombos)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}
