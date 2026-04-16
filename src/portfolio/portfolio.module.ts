import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from './portfolio.entity';
import { PortfolioImage } from './portfolio-image.entity';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([Portfolio, PortfolioImage])],
  providers: [PortfolioService, S3Service],
  controllers: [PortfolioController],
})
export class PortfolioModule {}
