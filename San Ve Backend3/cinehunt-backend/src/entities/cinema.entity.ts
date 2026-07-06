import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Room } from './room.entity';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn({ type: 'int' })
  cinemaId: number;

  @Column({ type: 'nvarchar', length: 180 })
  cinemaName: string;

  @Column({ type: 'nvarchar', length: 300 })
  address: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @OneToMany(() => Room, (room) => room.cinema)
  rooms: Room[];
}
