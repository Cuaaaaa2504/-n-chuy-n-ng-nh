import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Room } from './room.entity';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn({ name: 'cinema_id', type: 'int' })
  cinema_id: number;

  @Column({ name: 'cinema_name', type: 'nvarchar', length: 180 })
  cinema_name: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @OneToMany(() => Room, (room) => room.cinema)
  rooms: Room[];
}
