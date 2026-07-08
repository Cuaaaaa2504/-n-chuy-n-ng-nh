import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  // SQL: refresh_token_id BIGINT IDENTITY — entity cũ dùng int sai
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'refresh_token_id' })
  refreshTokenId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  // SQL: device_info NVARCHAR(300) — entity cũ dùng nvarchar length: 255 sai
  @Column({ name: 'device_info', type: 'nvarchar', length: 300, nullable: true })
  deviceInfo: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'expires_at', type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime2', precision: 0, nullable: true })
  revokedAt: Date | null;

  // SQL: replaced_by_id BIGINT NULL (self-ref FK) — entity cũ dùng int sai
  @Column({ name: 'replaced_by_id', type: 'bigint', nullable: true })
  replacedById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;
}
