import { Controller, Get } from '@nestjs/common';

import { TelegramBotService } from './bot.service';

@Controller('telegram-bot')
export class TelegramBotController {
  constructor(private telegramBotService: TelegramBotService) {}

  @Get()
  async getBotInformation() {
    const data = await this.telegramBotService.getBotInformation();
    return { data };
  }
}
