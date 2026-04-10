import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shortlist } from './shortlist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shortlist])],
})
export class ShortlistModule {}
