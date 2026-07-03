import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn({ name: 'otp_id', type: 'bigint' })
  otp_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 20 })
  purpose: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expires_at: Date;

  @Column({ name: 'verified_at', type: 'datetime2', precision: 0, nullable: true })
  verified_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
