import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Cinema } from './cinema.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn({ type: 'int', name: 'room_id' })
  roomId: number;

  @Column({ name: 'cinema_id', type: 'int' })
  cinemaId: number;

  @Column({ name: 'room_name', type: 'nvarchar', length: 50 })
  roomName: string;

  @Column({ name: 'total_seats', type: 'int', default: 0 })
  totalSeats: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => Cinema)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;
}
