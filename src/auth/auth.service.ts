import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /**
   * 1. Validate the user by email and password
   */
  async validateUser(email: string, pass: string): Promise<any> {
    // Find the user in our database
    const user = await this.userService.findOneByEmail(email);
    
    // Check if user exists and the password matches (using bcrypt for security)
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      // Return user data without the sensitive password hash
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * 2. Generate a JWT token for the user
   */
  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
