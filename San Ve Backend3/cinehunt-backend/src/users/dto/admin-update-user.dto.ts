import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsIn(['USER', 'CUSTOMER', 'STAFF', 'ADMIN'])
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'BANNED', 'DELETED'])
  status?: string;
}
