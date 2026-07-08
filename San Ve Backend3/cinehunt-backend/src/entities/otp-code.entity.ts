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
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'otp_id' })
  otpId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'code', type: 'varchar', length: 10 })
  code: string;

  @Column({ name: 'purpose', type: 'varchar', length: 30 })
  purpose: string;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @Column({ name: 'is_used', type: 'bit', default: false })
  isUsed: boolean;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'used_at', type: 'datetime2', precision: 0, nullable: true })
  usedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
