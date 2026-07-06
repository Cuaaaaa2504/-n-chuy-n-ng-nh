import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'int', name: 'refresh_token_id' })
  refreshTokenId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'device_info', type: 'nvarchar', length: 255, nullable: true })
  deviceInfo: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime2', precision: 0, nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'replaced_by_id', type: 'int', nullable: true })
  replacedById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;
}
