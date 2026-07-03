import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';
import { SeatType } from './seat-type.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn({ name: 'seat_id', type: 'int' })
  seat_id: number;

  @Column({ name: 'room_id', type: 'int' })
  room_id: number;

  @Column({ name: 'seat_row', type: 'varchar', length: 10 })
  seat_row: string;

  @Column({ name: 'seat_number', type: 'int' })
  seat_number: number;

  @Column({ name: 'seat_label', type: 'varchar', length: 20 })
  seat_label: string;

  @Column({ name: 'seat_type_id', type: 'int' })
  seat_type_id: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => SeatType)
  @JoinColumn({ name: 'seat_type_id' })
  seat_type: SeatType;
}
