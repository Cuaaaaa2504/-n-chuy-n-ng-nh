// src/database/entities/seat.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  seat_id: number;

  @Column()
  room_id: number;

  @Column({ type: 'varchar', length: 5 })
  seat_row: string;

  @Column()
  seat_number: number;

  @Column({ type: 'varchar', length: 20, default: 'NORMAL' })
  seat_type: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;
}