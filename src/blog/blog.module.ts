import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './blog-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost])],
})
export class BlogModule {}
