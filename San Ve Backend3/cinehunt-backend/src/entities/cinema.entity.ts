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

  @Column({ name: 'cinema_name', type: 'nvarchar', length: 100 })
  cinemaName: string;

  @Column({ name: 'address', type: 'nvarchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'city', type: 'nvarchar', length: 50, nullable: true })
  city: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @OneToMany(() => Room, (room) => room.cinema)
  rooms: Room[];
}
