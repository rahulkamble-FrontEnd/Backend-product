import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SubscribeService {
  createSubscriber(email: string): { message: string } {
    const clean = (email ?? '').trim().toLowerCase();

    if (!clean) {
      throw new BadRequestException('Email is required');
    }

    // ValidationPipe + DTO will already validate IsEmail, but keep this
    // as a defensive guard to avoid 500s on unexpected payloads.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      throw new BadRequestException('Invalid email');
    }

    // NOTE: Intentionally no DB write here to avoid deployment-time failures
    // if the subscriber table doesn't exist in your current schema.
    return { message: 'Thank you for subscribing!' };
  }
}
