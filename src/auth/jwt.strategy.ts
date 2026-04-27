import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthUser } from './types/auth-user.type';

type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: AuthUser['role'];
};

const extractJwtFromCookie = (request?: Request): string | null => {
  if (!request) return null;
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const jwt = cookies?.jwt;
  return typeof jwt === 'string' ? jwt : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
    });
  }

  /**
   * This method runs after the token is successfully decoded
   */
  validate(payload: JwtPayload): AuthUser {
    // Return user info from the payload (decoded token)
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
