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
  @PrimaryGeneratedColumn({ type: 'int', name: 'seat_id' })
  seatId: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId: number;

  @Column({ name: 'seat_type_id', type: 'int' })
  seatTypeId: number;

  @Column({ name: 'seat_row', type: 'varchar', length: 5 })
  seatRow: string;

  @Column({ name: 'seat_number', type: 'int' })
  seatNumber: number;

  @Column({ name: 'seat_label', type: 'varchar', length: 15 })
  seatLabel: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Room, (room) => room.seats)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => SeatType, { nullable: false, eager: false })
  @JoinColumn({ name: 'seat_type_id' })
  seatType: SeatType;
}
