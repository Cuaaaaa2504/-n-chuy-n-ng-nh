import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ChangeRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['USER', 'CUSTOMER', 'STAFF', 'ADMIN'])
  role: string;
}
