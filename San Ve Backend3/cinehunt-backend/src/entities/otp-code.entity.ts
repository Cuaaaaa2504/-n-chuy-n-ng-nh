import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn()
  otp_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: string; // VERIFY_EMAIL | RESET_PASSWORD | CHANGE_PHONE

  @Column({ name: 'expires_at', type: 'datetime' })
  expires_at: Date;

  @Column({ name: 'is_used', type: 'bit', default: false })
  is_used: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
