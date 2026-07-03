import { Entity, ManyToOne, JoinColumn, Column, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  user_id: number;

  @PrimaryColumn({ name: 'role_id', type: 'int' })
  role_id: number;

  @Column({ name: 'assigned_at', type: 'datetime2', precision: 0 })
  assigned_at: Date;

  @ManyToOne(() => User, (user) => user.user_roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.user_roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
