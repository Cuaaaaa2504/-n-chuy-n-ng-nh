import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Seat } from './seat.entity';

@Entity('seat_types')
export class SeatType {
  @PrimaryGeneratedColumn({ name: 'seat_type_id', type: 'int' })
  seat_type_id: number;

  @Column({ name: 'type_code', type: 'varchar', length: 30, unique: true })
  type_code: string;

  @Column({ name: 'type_name', type: 'nvarchar', length: 80 })
  type_name: string;

  @Column({ name: 'price_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1 })
  price_multiplier: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @OneToMany(() => Seat, (seat) => seat.seatType)
  seats: Seat[];
}
