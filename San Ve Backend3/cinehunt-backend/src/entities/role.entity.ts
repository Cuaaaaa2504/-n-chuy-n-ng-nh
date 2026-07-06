import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'int' })
  roleId: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  roleCode: string;

  @Column({ type: 'nvarchar', length: 80 })
  roleName: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];
}
