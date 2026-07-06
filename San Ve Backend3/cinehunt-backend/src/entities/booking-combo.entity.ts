import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingOrder } from './booking-order.entity';
import { ConcessionCombo } from './concession-combo.entity';

@Entity('booking_combos')
export class BookingCombo {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  bookingComboId: string;

  @Column({ type: 'bigint' })
  bookingId: string;

  @Column({ type: 'int' })
  comboId: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    nullable: true,
  })
  totalPrice: number | null;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingCombos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}
