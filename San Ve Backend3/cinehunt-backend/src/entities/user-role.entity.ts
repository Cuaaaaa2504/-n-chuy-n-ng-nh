import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
export class UserRole {
  // SQL: PRIMARY KEY (user_id, role_id) — composite key, KHÔNG có cột user_role_id
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @PrimaryColumn({ name: 'role_id', type: 'int' })
  roleId: number;

  // SQL: assigned_at DATETIME2(0) DEFAULT SYSDATETIME()
  @CreateDateColumn({ name: 'assigned_at', type: 'datetime2', precision: 0 })
  assignedAt: Date;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
