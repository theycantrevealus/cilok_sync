import CrmBackendConfig from '@configs/crm-backend.config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel } from 'diagnostics_channel';

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
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { CrmbController } from '@/crmb/controllers/crmb.controller';
import { CrmbConfig } from '@/crmb/integration/crmb.config';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { ApplicationService } from "@/application/services/application.service";
import { SlRedisService } from "@slredis/slredis.service";

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [CrmBackendConfig],
    }),
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [CrmbController],
  providers: [
    ApplicationService,
    SlRedisService,
    CrmbConfig,
    MainCrmbService,
    MainCrmbIntegration,
    LoggingInterceptor,
    ChannelService,
    AccountService,
  ],
  exports: [MainCrmbService],
})
export class CrmbModule {}
