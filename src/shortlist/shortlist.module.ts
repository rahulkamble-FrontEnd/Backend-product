import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shortlist } from './shortlist.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { Notification } from '../notification/notification.entity';
import { DesignerNote } from '../user/designer-note.entity';
import { DesignerRecommendation } from '../user/designer-recommendation.entity';
import { ShortlistApiController } from './shortlist-api.controller';
import { ShortlistApiService } from './shortlist-api.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shortlist,
      Product,
      User,
      Notification,
      DesignerNote,
      DesignerRecommendation,
    ]),
  ],
  controllers: [ShortlistApiController],
  providers: [ShortlistApiService],
})
export class ShortlistModule {}
