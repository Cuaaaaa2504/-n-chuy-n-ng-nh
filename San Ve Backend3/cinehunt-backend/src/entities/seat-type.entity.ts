import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seat_types')
export class SeatType {
  @PrimaryGeneratedColumn({ name: 'seat_type_id', type: 'int' })
  seat_type_id: number;

  @Column({ name: 'seat_type_name', type: 'nvarchar', length: 80 })
  seat_type_name: string;

  @Column({ name: 'price_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1 })
  price_multiplier: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;
}
