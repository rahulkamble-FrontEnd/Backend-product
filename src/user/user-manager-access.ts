import type { AuthUser } from '../auth/types/auth-user.type';
import { UserRole } from './dto/create-user.dto';

/**
 * Designers who may also create customers/designers and assign primary/secondary
 * designers to customers. Compared case-insensitively against the JWT email.
 */
const LIMITED_USER_MANAGER_EMAILS = new Set(['premkumar.p@customfurnish.com']);

/** Roles a limited user manager may create and list. */
export const LIMITED_MANAGEABLE_ROLES: readonly UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.DESIGNER,
];

export type UserManagerScope = 'full' | 'limited' | null;

export function getUserManagerScope(
  user: Pick<AuthUser, 'email' | 'role'> | undefined,
): UserManagerScope {
  if (!user) return null;
  if (user.role === UserRole.ADMIN || user.role === UserRole.USERADMIN) {
    return 'full';
  }
  if (
    user.role === UserRole.DESIGNER &&
    LIMITED_USER_MANAGER_EMAILS.has((user.email ?? '').trim().toLowerCase())
  ) {
    return 'limited';
  }
  return null;
}
