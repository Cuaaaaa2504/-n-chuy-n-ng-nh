import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn({ type: 'int', name: 'cinema_id' })
  cinemaId: number;

  @Column({ name: 'cinema_name', type: 'nvarchar', length: 180 })
  cinemaName: string;

  @Column({ name: 'address', type: 'nvarchar', length: 300 })
  address: string;

  @Column({ name: 'city', type: 'nvarchar', length: 100, nullable: true })
  city: string | null;

  @Column({ name: 'district', type: 'nvarchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @OneToMany(() => Room, (room) => room.cinema)
  rooms: Room[];
}
