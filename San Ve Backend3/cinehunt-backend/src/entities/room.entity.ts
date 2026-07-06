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
  @PrimaryGeneratedColumn({ type: 'int' })
  roomId: number;

  @Column({ type: 'int' })
  cinemaId: number;

  @Column({ type: 'nvarchar', length: 100 })
  roomName: string;

  @Column({ type: 'varchar', length: 30, default: 'STANDARD' })
  roomType: string;

  @Column({ type: 'int', default: 0 })
  totalSeats: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => Cinema, (cinema) => cinema.rooms)
  @JoinColumn()
  cinema: Cinema;
}
