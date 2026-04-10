import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trending } from './trending.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trending])],
})
export class TrendingModule {}
