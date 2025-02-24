import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

import { AccountModule } from '@/account/account.module';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { ChannelModule } from '@/channel/channel.module';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { LoggingModule } from '../logging/logging.module';
import { APILog, APILogSchema } from '../logging/models/api.logs.model';
import { OauthLogs, OauthLogsSchema } from '../logging/models/oauth-logs.model';
import { ReportKeywordController } from './controllers/report-keyword.controller';
import { ReportTrendChannelRedeemerController } from './controllers/report-trend-channel-redeemer.controller';
import { ReportTrendErrorRedeemController } from './controllers/report-trend-error-redeem.controller';
import {
  ReportKeyword,
  ReportKeywordSchema,
} from './models/report-keyword.model';
import {
  ReportTrendChannelRedeemer,
  ReportTrendChannelRedeemerSchema,
} from './models/report-trend-channel-redeemer.model';
import {
  ReportTrendErrorRedeem,
  ReportTrendErrorRedeemSchema,
} from './models/report-trend-error-redeem.model';
import { ReportKeywordService } from './services/report-keyword.service';
import { ReportTrendChannelRedeemerService } from './services/report-trend-channel-redeemer.service';
import { ReportTrendErrorRedeemService } from './services/report-trend-error-redeem.service';

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: OauthLogs.name, schema: OauthLogsSchema },
      { name: ReportKeyword.name, schema: ReportKeywordSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      {
        name: ReportTrendChannelRedeemer.name,
        schema: ReportTrendChannelRedeemerSchema,
      },
      {
        name: ReportTrendErrorRedeem.name,
        schema: ReportTrendErrorRedeemSchema,
      },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    ChannelModule,
    AccountModule,
  ],
  providers: [
    ApplicationService,
    SlRedisService,
    LoggingInterceptor,
    ReportKeywordService,
    ReportTrendChannelRedeemerService,
    ReportTrendErrorRedeemService,
  ],
  controllers: [
    ReportKeywordController,
    ReportTrendChannelRedeemerController,
    ReportTrendErrorRedeemController,
  ],
  exports: [
    ReportKeywordService,
    ReportTrendChannelRedeemerService,
    ReportTrendErrorRedeemService,
  ],
})
export class ReportModule {}
