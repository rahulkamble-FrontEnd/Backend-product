import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Extract the JWT from the cookie named 'jwt'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => request?.cookies?.jwt,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
    });
  }

  /**
   * This method runs after the token is successfully decoded
   */
  async validate(payload: any) {
    // Return user info from the payload (decoded token)
    return { 
      id: payload.sub, 
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
  }
}
