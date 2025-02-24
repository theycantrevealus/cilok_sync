import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { HttpInterceptor } from './http-interceptor.module';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>('TELEGRAM_API_BASE_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [HttpInterceptor],
  exports: [HttpModule],
})
export class HttpClientModule {}
