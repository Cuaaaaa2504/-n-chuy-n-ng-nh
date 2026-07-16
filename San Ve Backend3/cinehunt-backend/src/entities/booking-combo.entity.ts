import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_combos')
export class BookingCombo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'booking_combo_id' })
  bookingComboId: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @Column({ name: 'combo_id', type: 'int' })
  comboId: number;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  // SQL: total_price AS (CONVERT(DECIMAL(12,2), quantity * unit_price)) PERSISTED
  // Computed column — chỉ đọc, không insert/update
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    select: true,
  })
  totalPrice: number;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingCombos)
  @JoinColumn({ name: 'booking_id' })
  bookingOrder: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}
