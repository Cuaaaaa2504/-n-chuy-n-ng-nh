import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Room } from './room.entity';
import { SeatType } from './seat-type.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn({ type: 'int' })
  seatId: number;

  @Column({ type: 'int' })
  roomId: number;

  @Column({ type: 'int' })
  seatTypeId: number;

  @Column({ type: 'varchar', length: 5 })
  seatRow: string;

  @Column({ type: 'int' })
  seatNumber: number;

  @Column({ type: 'varchar', length: 15 })
  seatLabel: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => SeatType)
  @JoinColumn({ name: 'seat_type_id' })
  seatType: SeatType;
}
