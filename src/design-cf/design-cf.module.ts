import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Service } from '../common/services/s3.service';
import { DesignCf } from './design-cf.entity';
import { DesignCfImage } from './design-cf-image.entity';
import { DesignCfService } from './design-cf.service';
import { DesignCfController } from './design-cf.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DesignCf, DesignCfImage])],
  providers: [DesignCfService, S3Service],
  controllers: [DesignCfController],
})
export class DesignCfModule {}
