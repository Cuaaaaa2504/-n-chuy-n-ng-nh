import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_combos')  // ← SỬA: booking_products → booking_combos
export class BookingCombo {
  @PrimaryGeneratedColumn({ name: 'booking_combo_id', type: 'bigint' })
  booking_combo_id: string;  // ← SỬA: booking_product_id → booking_combo_id

  @Column({ name: 'booking_id', type: 'bigint' })
  booking_id: string;

  @Column({ name: 'combo_id', type: 'int' })  // ← SỬA: product_id → combo_id
  combo_id: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  // total_price là computed column trong DB (PERSISTED) — chỉ đọc
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    nullable: true,
  })
  total_price: number | null;

  @ManyToOne(() => BookingOrder, (booking) => booking.booking_combos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}
