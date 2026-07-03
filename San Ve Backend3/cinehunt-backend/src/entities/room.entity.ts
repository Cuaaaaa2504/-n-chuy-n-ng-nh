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
  @PrimaryGeneratedColumn({ name: 'room_id', type: 'int' })
  room_id: number;

  @Column({ name: 'cinema_id', type: 'int' })
  cinema_id: number;

  @Column({ name: 'room_name', type: 'nvarchar', length: 100 })
  room_name: string;

  @Column({ name: 'room_type', type: 'varchar', length: 30, default: 'STANDARD' })
  room_type: string;

  @Column({ name: 'total_seats', type: 'int', default: 0 })
  total_seats: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => Cinema, (cinema) => cinema.rooms)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;
}
