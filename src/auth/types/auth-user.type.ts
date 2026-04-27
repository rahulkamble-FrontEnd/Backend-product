import type { Request } from 'express';
import type { UserRole } from '../../user/dto/create-user.dto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

export type OptionalAuthenticatedRequest = Request & {
  user?: AuthUser;
};
