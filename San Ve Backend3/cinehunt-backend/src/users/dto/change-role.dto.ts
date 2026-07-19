import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * Frontend (types/user.ts) dùng nhãn 'USER' | 'ADMIN',
 * DB (SQL CHECK) dùng 'CUSTOMER' | 'STAFF' | 'ADMIN'.
 * DTO chấp nhận cả hai, service sẽ chuẩn hoá về giá trị DB.
 */
export class ChangeRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['USER', 'CUSTOMER', 'STAFF', 'ADMIN'])
  role: string;
}
