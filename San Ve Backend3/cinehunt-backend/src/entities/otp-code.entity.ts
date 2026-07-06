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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  otpId: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: string;

  @Column({ type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @Column({ type: 'bit', default: false })
  isUsed: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  usedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
