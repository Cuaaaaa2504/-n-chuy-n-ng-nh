import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'user_id' })
  userId: number;

  // SQL: full_name NVARCHAR(120) — entity cũ dùng length: 100 sai
  @Column({ name: 'full_name', type: 'nvarchar', length: 120 })
  fullName: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  // SQL: avatar_url NVARCHAR(500) — entity cũ dùng varchar sai
  @Column({ name: 'avatar_url', type: 'nvarchar', length: 500, nullable: true })
  avatarUrl: string | null;

  // SQL: date_of_birth DATE NULL — thiếu hoàn toàn trong entity cũ
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'email_verified', type: 'bit', default: false })
  emailVerified: boolean;

  // SQL: failed_login_attempts INT NOT NULL DEFAULT 0 — thiếu trong entity cũ
  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  // SQL: locked_until DATETIME2(0) NULL — thiếu trong entity cũ
  @Column({ name: 'locked_until', type: 'datetime2', precision: 0, nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'last_login_at', type: 'datetime2', precision: 0, nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, select: false, insert: false, update: false })
  updatedAt: Date | null;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];
}
