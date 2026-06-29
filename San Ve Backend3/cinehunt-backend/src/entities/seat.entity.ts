import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  seat_id: number;

  @Column({ name: 'room_id' })
  room_id: number;

  @Column({ name: 'seat_row', type: 'varchar', length: 5 })
  seat_row: string;

  @Column({ name: 'seat_number' })
  seat_number: number;

  @Column({ name: 'seat_type', type: 'varchar', length: 20, default: 'NORMAL' })
  seat_type: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;
}