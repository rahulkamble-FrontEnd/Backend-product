import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteLogController } from './delete-log.controller';
import { DeleteLog } from './delete-log.entity';
import { DeleteLogInterceptor } from './delete-log.interceptor';
import { DeleteLogService } from './delete-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeleteLog])],
  providers: [
    DeleteLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DeleteLogInterceptor,
    },
  ],
  controllers: [DeleteLogController],
})
export class DeleteLogModule {}
