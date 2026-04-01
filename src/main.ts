import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  /**
   * 1. GLOBAL PREFIX
   * All routes will start with /api (e.g., http://localhost:3000/api/auth/login)
   */
  app.setGlobalPrefix('api');

  /**
   * 2. VALIDATION PIPE
   * This automatically checks incoming request data against our DTOs (Data Transfer Objects).
   * - whitelist: true (Removes any fields that are not defined in the DTO)
   * - forbidNonWhitelisted: true (Throws an error if extra fields are sent)
   */
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  /**
   * 3. CORS
   * Allows our front-end application to communicate with this back-end API.
   */
  app.enableCors({
    origin: true, // In production, replace with your frontend URL
    credentials: true, // Required for cookies to work
  });

  /**
   * 4. COOKIE PARSER
   * This middleware allows NestJS to read cookies from incoming requests.
   */
  app.use(cookieParser());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
