import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 👈 add ConfigService here
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    /**
     * 1. CONFIG MODULE
     * This loads our .env file and makes the variables available globally.
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /**
     * 2. TYPEORM MODULE (DATABASE)
     * This connects NestJS to our MySQL database using the credentials from our .env file.
     * - synchronize: true (Automatically creates/updates database tables based on our Entities)
     */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true, // This tells TypeORM to automatically load all @Entity classes
        synchronize: true, // DO NOT use this in production; it can cause data loss!
      }),
    }),

    /**
     * 3. FEATURE MODULES
     * These are our custom modules that contain our business logic.
     */
    AuthModule,
    UserModule,
    CategoryModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
