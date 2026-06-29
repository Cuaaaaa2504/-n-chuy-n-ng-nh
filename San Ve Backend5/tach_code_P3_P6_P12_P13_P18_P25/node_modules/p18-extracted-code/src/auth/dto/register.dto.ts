import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  @MaxLength(100, { message: 'Họ tên tối đa 100 ký tự' })
  fullName: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(100, { message: 'Email tối đa 100 ký tự theo SQL' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  phone?: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(100, { message: 'Mật khẩu tối đa 100 ký tự' })
  password: string;
}
