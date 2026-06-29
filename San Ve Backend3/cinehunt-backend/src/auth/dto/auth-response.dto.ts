export class AuthResponseDto {
  accessToken: string;
  user: {
    userId: number;
    fullName: string;
    email: string;
    role: string;
  };
}