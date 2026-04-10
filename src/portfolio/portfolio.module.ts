import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from './portfolio.entity';
import { PortfolioImage } from './portfolio-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Portfolio, PortfolioImage])],
})
export class PortfolioModule {}
