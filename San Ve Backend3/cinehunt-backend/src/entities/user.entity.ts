import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  userId: number;

  @Column({ type: 'nvarchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'bit', default: false })
  emailVerified: boolean;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'datetime2', precision: 0, nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string; // 'CUSTOMER' | 'STAFF' | 'ADMIN'

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string; // 'ACTIVE' | 'LOCKED' | 'BANNED' | 'DELETED'

  @CreateDateColumn({ type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}
