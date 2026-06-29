import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Cinema } from './cinema.entity';
import { Seat } from './seat.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  room_id: number;

  @Column({ name: 'cinema_id' })
  cinema_id: number;

  @Column({ name: 'room_name', type: 'nvarchar', length: 100 })
  room_name: string;

  @Column({ name: 'total_seats' })
  total_seats: number;

  @Column({ name: 'room_type', type: 'varchar', length: 20, default: 'STANDARD' })
  room_type: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Cinema)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;

  @OneToMany(() => Seat, seat => seat.room)
  seats: Seat[];
}