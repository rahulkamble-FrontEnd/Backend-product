import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 👈 add ConfigService here
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';
import { ShortlistModule } from './shortlist/shortlist.module';
import { NotificationModule } from './notification/notification.module';
import { BlogModule } from './blog/blog.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TrendingModule } from './trending/trending.module';
import { TagsModule } from './tags/tags.module';
import { DesignCfModule } from './design-cf/design-cf.module';
import { DbTransientRetryInterceptor } from './common/interceptors/db-transient-retry.interceptor';

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
        keepConnectionAlive: true,
        retryAttempts: 10,
        retryDelay: 3000,
        // Safe default for production; enable only when explicitly set.
        synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        extra: {
          // Keep connections stable across idle/network blips.
          connectionLimit: 10,
          waitForConnections: true,
          queueLimit: 0,
          connectTimeout: 30000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        },
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
    ShortlistModule,
    NotificationModule,
    BlogModule,
    PortfolioModule,
    TrendingModule,
    TagsModule,
    DesignCfModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DbTransientRetryInterceptor,
    },
  ],
})
export class AppModule {}
