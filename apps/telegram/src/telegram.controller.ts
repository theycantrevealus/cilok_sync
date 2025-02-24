import { Controller, Get } from '@nestjs/common';

import { TelegramService } from './telegram.service';

@Controller()
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get()
  getAppInformation() {
    return this.telegramService.getAppInformation();
  }
}
