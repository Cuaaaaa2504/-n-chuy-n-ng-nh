// src/database/entities/cinema.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Room } from './room.entity';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  cinema_id: number;

  @Column({ type: 'nvarchar', length: 150 })
  cinema_name: string;

  @Column({ type: 'nvarchar', length: 255 })
  address: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Room, room => room.cinema)
  rooms: Room[];
}