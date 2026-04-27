import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/dto/create-user.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return requiredRoles.some((role) => user.role === role);
  }
}
