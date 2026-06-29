import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Bạn chưa đăng nhập');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Admin mới có quyền thực hiện thao tác này');
    }

    return true;
  }
}
