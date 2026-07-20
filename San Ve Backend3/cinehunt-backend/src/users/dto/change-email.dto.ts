import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * FIX: tính năng đổi email trước đây chưa được implement ở backend.
 * Frontend gọi PATCH /users/me/email với { newEmail, currentPassword } -> 404.
 */
export class ChangeEmailDto {
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  @IsEmail({}, { message: 'Email mới không đúng định dạng' })
  @MaxLength(150, { message: 'Email không được vượt quá 150 ký tự' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  newEmail: string;

  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  currentPassword: string;
}
