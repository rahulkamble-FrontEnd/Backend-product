import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 1. POST /api/auth/login
   * Validates user and sets an httpOnly JWT cookie
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    // Validate credentials
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create the token
    const { access_token } = await this.authService.login(user);
    
    // Set the token as a secure cookie
    response.cookie('jwt', access_token, { 
      httpOnly: true, // Secure: cookie cannot be accessed via JS
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 3600000 // 1 hour
    });

    return { message: 'Login successful' };
  }

  /**
   * 2. POST /api/auth/logout
   * Clears the JWT cookie
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt');
    return { message: 'Logout successful' };
  }

  /**
   * 3. GET /api/auth/profile
   * Returns user info if authenticated (using JwtStrategy)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  /**
   * 4. GET /api/auth/me
   * Returns id, name, and role of the current user
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req) {
    const { id, name, role } = req.user;
    return { id, name, role };
  }

  /**
   * 5. POST /api/auth/forgot-password
   * Sends a password reset link (simulated)
   */
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  /**
   * 6. POST /api/auth/reset-password
   * Resets the user's password
   */
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
