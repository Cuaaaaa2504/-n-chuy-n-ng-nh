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

  // SQL: column name is user_id
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'code', type: 'varchar', length: 10 })
  code: string;

  // SQL CHECK: ('VERIFY_EMAIL','FORGOT_PASSWORD','RESET_PASSWORD','LOGIN')
  // Entity cũ thiếu 'CHANGE_PHONE' không có trong DB CHECK, và thiếu 'FORGOT_PASSWORD','LOGIN'
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
