import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Cinema } from './cinema.entity';
import { Seat } from './seat.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn({ type: 'int', name: 'room_id' })
  roomId: number;

  @Column({ name: 'cinema_id', type: 'int' })
  cinemaId: number;

  @Column({ name: 'room_name', type: 'nvarchar', length: 100 })
  roomName: string;

  // SQL CHECK: ('STANDARD','VIP','IMAX','4DX') — entity cũ thiếu cột này
  @Column({ name: 'room_type', type: 'varchar', length: 30, default: 'STANDARD' })
  roomType: string;

  @Column({ name: 'total_seats', type: 'int', default: 0 })
  totalSeats: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => Cinema, (cinema) => cinema.rooms)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;

  @OneToMany(() => Seat, (seat) => seat.room)
  seats: Seat[];
}
