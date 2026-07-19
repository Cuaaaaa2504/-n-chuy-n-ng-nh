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
  //
  // FIX [BUG-02]: khai báo đúng đây là COMPUTED COLUMN.
  // Chỉ để insert:false/update:false là chưa đủ — TypeORM vẫn coi nó là cột thường
  // và có thể reload entity sau INSERT. Với `asExpression` + `generatedType: 'STORED'`,
  // TypeORM hiểu giá trị do DB sinh ra: không đưa vào INSERT/UPDATE và không ghi đè.
  // (synchronize đang false nên khai báo này không sinh migration.)
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    select: true,
    nullable: true,
    asExpression: 'CONVERT(DECIMAL(12,2), quantity * unit_price)',
    generatedType: 'STORED',
  })
  totalPrice: number;

  @ManyToOne(() => BookingOrder, (booking) => booking.bookingCombos)
  @JoinColumn({ name: 'booking_id' })
  bookingOrder: BookingOrder;

  @ManyToOne(() => ConcessionCombo)
  @JoinColumn({ name: 'combo_id' })
  combo: ConcessionCombo;
}
