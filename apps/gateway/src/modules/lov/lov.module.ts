import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';

import { AccountModule } from '@/account/account.module';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '@/account/models/account.location.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { LovController } from '@/lov/controllers/lov.controller';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { ProgramGroupController } from './controllers/program.group.controller';
import { ProgramGroup, ProgramGroupSchema } from './models/program.group.model';
import { ProgramGroupService } from './services/program.group.service';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { ApplicationService } from "@/application/services/application.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: Lov.name, schema: LovSchema },
      { name: ProgramGroup.name, schema: ProgramGroupSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    LoggingModule,
    AccountModule,
    HttpModule,
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [LovController, ProgramGroupController],
  providers: [
    ApplicationService,
    SlRedisService,
    LovService,
    ChannelService,
    LoggingInterceptor,
    AccountService,
    ProgramGroupService,
    SlconfigService,
    SlRedisService,
  ],
  exports: [LovService],
})
export class LovModule {
  //
}
