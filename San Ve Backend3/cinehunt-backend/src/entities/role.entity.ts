import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'role_id', type: 'int' })
  role_id: number;

  @Column({ name: 'role_code', type: 'varchar', length: 30, unique: true })
  role_code: string;

  @Column({ name: 'role_name', type: 'nvarchar', length: 80 })
  role_name: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  user_roles: UserRole[];
}
