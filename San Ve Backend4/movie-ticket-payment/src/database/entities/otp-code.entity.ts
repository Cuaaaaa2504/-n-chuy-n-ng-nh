// src/database/entities/otp-code.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn()
  otp_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  otp_code: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: string;

  @Column({ type: 'datetime' })
  expired_at: Date;

  @Column({ type: 'datetime', nullable: true })
  used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}