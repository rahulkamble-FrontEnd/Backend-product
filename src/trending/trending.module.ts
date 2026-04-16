import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trending } from './trending.entity';
import { TrendingService } from './trending.service';
import { TrendingController } from './trending.controller';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trending])],
  providers: [TrendingService, S3Service],
  controllers: [TrendingController],
})
export class TrendingModule {}
