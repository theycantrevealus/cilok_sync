import { RedisDataMaster, RedisLuckyDraw } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '@/account/models/account.location.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LuckyDrawController } from '@/lucky-draw/controllers/lucky.draw.controller';
import {
  LuckyDrawUploadDetailModel,
  LuckyDrawUploadDetailSchema,
} from '@/lucky-draw/models/lucky.draw.upload.detail.model';
import {
  LuckyDrawUploadModel,
  LuckyDrawUploadSchema,
} from '@/lucky-draw/models/lucky.draw.upload.model';
import { LuckyDrawProcessor } from '@/lucky-draw/processors/lucky.draw.processor';
import { LuckyDrawService } from '@/lucky-draw/services/lucky.draw.service';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: LuckyDrawUploadModel.name, schema: LuckyDrawUploadSchema },
      {
        name: LuckyDrawUploadDetailModel.name,
        schema: LuckyDrawUploadDetailSchema,
      },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
    ]),
    LoggingModule,
    HttpModule,
    BullModule.registerQueueAsync(RedisLuckyDraw),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [LuckyDrawController],
  providers: [
    ApplicationService,
    ChannelService,
    AccountService,
    LuckyDrawService,
    LuckyDrawProcessor,
    SlRedisService,
  ],
})
export class LuckyDrawModule {
  //
}
