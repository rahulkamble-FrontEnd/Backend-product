import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DesignerNote } from './designer-note.entity';
import { DesignerRecommendation } from './designer-recommendation.entity';
import { DesignerController } from './designer.controller';
import { Shortlist } from '../shortlist/shortlist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      DesignerNote,
      DesignerRecommendation,
      Shortlist,
    ]),
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController, DesignerController],
})
export class UserModule {}
