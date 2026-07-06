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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  refreshTokenId: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  deviceInfo: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'datetime2', precision: 0 })
  expiresAt: Date;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'bigint', nullable: true })
  replacedById: string | null;

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  get isActive(): boolean {
    return this.revokedAt === null && this.expiresAt > new Date();
  }
}
