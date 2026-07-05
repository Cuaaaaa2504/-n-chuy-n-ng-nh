import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ name: 'refresh_token_id', type: 'bigint' })
  refresh_token_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  token_hash: string;

  @Column({ name: 'device_info', type: 'nvarchar', length: 300, nullable: true })
  device_info: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expires_at: Date;

  @Column({ name: 'revoked_at', type: 'datetime2', precision: 0, nullable: true })
  revoked_at: Date | null;

  @Column({ name: 'replaced_by_id', type: 'bigint', nullable: true })
  replaced_by_id: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Token còn hiệu lực không (chưa bị revoke và chưa hết hạn) */
  get isActive(): boolean {
    return this.revoked_at === null && this.expires_at > new Date();
  }
}
