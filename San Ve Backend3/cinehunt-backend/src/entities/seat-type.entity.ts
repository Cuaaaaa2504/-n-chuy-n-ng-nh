import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Seat } from './seat.entity';

@Entity('seat_types')
export class SeatType {
  @PrimaryGeneratedColumn({ type: 'int', name: 'seat_type_id' })
  seatTypeId: number;

  @Column({ name: 'type_code', type: 'varchar', length: 20 })
  typeCode: string;

  @Column({ name: 'type_name', type: 'nvarchar', length: 50 })
  typeName: string;

  @Column({ name: 'price_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  priceMultiplier: number;

  @OneToMany(() => Seat, (seat) => seat.seatType)
  seats: Seat[];
}
