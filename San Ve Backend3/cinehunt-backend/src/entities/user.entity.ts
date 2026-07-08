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

  @Column({ name: 'full_name', type: 'nvarchar', length: 120 })
  fullName: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  // FIX [M-15]: thêm select: false để passwordHash không bao giờ bị trả về
  // trong các query thông thường — phải dùng addSelect() rõ ràng mới lấy được
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'avatar_url', type: 'nvarchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'email_verified', type: 'bit', default: false })
  emailVerified: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime2', precision: 0, nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'datetime2', precision: 0, nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 0, nullable: true, select: false, insert: false, update: false })
  updatedAt: Date | null;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];
}
