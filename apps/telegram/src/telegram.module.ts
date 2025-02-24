import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerMiddleware } from './middleware/logger.middleware';
import { TelegramBotModule } from './modules/bot/bot.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
    }),
    TelegramBotModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, Logger],
})
export class TelegramModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
