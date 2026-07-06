import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seat_types')
export class SeatType {
  @PrimaryGeneratedColumn({ type: 'int' })
  seatTypeId: number;

  @Column({ type: 'varchar', length: 30 })
  typeCode: string;

  @Column({ type: 'nvarchar', length: 80 })
  typeName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  priceMultiplier: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;
}
