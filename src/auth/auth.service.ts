import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
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
      sub: user.id,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * 3. Forgot Password
   * Generates a reset token and saves it to the user
   */
  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User with that email does not exist');
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token and save it to the database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiration to 10 minutes from now
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.userService.save(user);

    // In a real app, you would email this token to the user
    return { resetToken };
  }

  /**
   * 4. Reset Password
   * Validates the token and updates the user's password
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hash the incoming token to match the one in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userService.findOneByResetToken(hashedToken);

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new NotFoundException(
        'Password reset token is invalid or has expired',
      );
    }

    // Hash the new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);

    // Clear the reset token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userService.save(user);

    return { message: 'Password has been reset successfully' };
  }
}
