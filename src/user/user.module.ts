import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DesignerNote } from './designer-note.entity';
import { DesignerRecommendation } from './designer-recommendation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DesignerNote, DesignerRecommendation]),
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
