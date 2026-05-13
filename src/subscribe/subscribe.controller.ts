import { Body, Controller, Post } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { SubscribeService } from './subscribe.service';

@Controller('subscribe')
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}

  // POST /api/subscribe/create
  @Post('create')
  create(@Body() createSubscriberDto: CreateSubscriberDto) {
    return this.subscribeService.createSubscriber(createSubscriberDto.email);
  }
}
