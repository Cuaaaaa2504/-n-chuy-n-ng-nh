import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn({ name: 'otp_id', type: 'bigint' })
  otp_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: string;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expires_at: Date;

  @Column({ name: 'is_used', type: 'bit', default: false })
  is_used: boolean;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @Column({ name: 'used_at', type: 'datetime2', precision: 0, nullable: true })
  used_at: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
