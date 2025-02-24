import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';

import { HttpClientModule } from '../http/http-client.module';
import { TelegramBotController } from './bot.controller';
import { TelegramBotService } from './bot.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    HttpClientModule,
  ],
  controllers: [TelegramBotController],
  providers: [TelegramBotService, Logger],
})
export class TelegramBotModule {}
