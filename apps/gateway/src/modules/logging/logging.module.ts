import { RedisLogging } from '@configs/redis/redis.module';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { OauthLogs, OauthLogsSchema } from './models/oauth-logs.model';
import { LogOauthProcessor } from './processors/oauth/oauth.processor';
import {
  LogOauthRefreshTokenService,
  LogOauthSignInService,
  LogOauthSignOutService,
} from './services/oauth/oauth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OauthLogs.name, schema: OauthLogsSchema },
    ]),
    BullModule.registerQueueAsync(RedisLogging),
  ],
  exports: [
    LogOauthRefreshTokenService,
    LogOauthSignInService,
    LogOauthSignOutService,
  ],
  providers: [
    LogOauthRefreshTokenService,
    LogOauthSignInService,
    LogOauthSignOutService,
    LogOauthProcessor,
  ],
})
export class LoggingModule {}
