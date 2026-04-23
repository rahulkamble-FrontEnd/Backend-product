import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser): TUser | null {
    if (err) {
      return null;
    }
    return user ?? null;
  }

  // Allow unauthenticated requests to pass, while still parsing JWT when present.
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
