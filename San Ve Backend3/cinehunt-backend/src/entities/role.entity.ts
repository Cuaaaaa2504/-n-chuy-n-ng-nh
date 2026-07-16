import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'int', name: 'role_id' })
  roleId: number;

  @Column({ name: 'role_code', type: 'varchar', length: 30, unique: true })
  roleCode: string;

  @Column({ name: 'role_name', type: 'nvarchar', length: 80 })
  roleName: string;

  @Column({ name: 'description', type: 'nvarchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
