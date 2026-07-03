import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'full_name', type: 'nvarchar', length: 120 })
  full_name: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, nullable: true })
  refresh_token_hash: string | null;

  @Column({ name: 'avatar_url', type: 'nvarchar', length: 500, nullable: true })
  avatar_url: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth: Date | null;

  @Column({ name: 'email_verified', type: 'bit', default: false })
  email_verified: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failed_login_attempts: number;

  @Column({ name: 'locked_until', type: 'datetime2', precision: 0, nullable: true })
  locked_until: Date | null;

  /** role: CUSTOMER | ADMIN | STAFF  — lấy từ bảng user_roles qua helper getter */
  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'last_login_at', type: 'datetime2', precision: 0, nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updated_at: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  user_roles: UserRole[];
}
