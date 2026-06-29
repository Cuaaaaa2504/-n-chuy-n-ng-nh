// src/database/entities/room.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Cinema } from './cinema.entity';
import { Seat } from './seat.entity';
import { Showtime } from './showtime.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  room_id: number;

  @Column()
  cinema_id: number;

  @Column({ type: 'nvarchar', length: 100 })
  room_name: string;

  @Column()
  total_seats: number;

  @Column({ type: 'varchar', length: 20, default: 'STANDARD' })
  room_type: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Cinema)
  @JoinColumn({ name: 'cinema_id' })
  cinema: Cinema;

  @OneToMany(() => Seat, seat => seat.room)
  seats: Seat[];

  @OneToMany(() => Showtime, showtime => showtime.room)
  showtimes: Showtime[];
}