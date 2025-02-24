import EsbBackendConfig from '@configs/esb-backend.config';
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
import { Role, RoleSchema } from '@/account/models/role.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { EsbTransactionIntegration } from '@/esb/integration/esb.transaction.integration';
import { EsbTransactionService } from '@/esb/services/esb.transaction.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { EsbController } from './controllers/esb.controller';
import { EsbConfigIntegration } from './integration/esb.config.integration';
import { EsbInboxIntegration } from './integration/esb.inbox.integration';
import { EsbNotificationIntegration } from './integration/esb.notification.integration';
import { EsbOrderIntegration } from './integration/esb.order.integration';
import { EsbProfileIntegration } from './integration/esb.profile.integration';
import { EsbInboxService } from './services/esb.inbox.service';
import { EsbNotificationService } from './services/esb.notification.service';
import { EsbOrderService } from './services/esb.order.service';
import { EsbProfileService } from './services/esb.profile.service';
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { ApplicationService } from "@/application/services/application.service";
import { SlRedisService } from "@slredis/slredis.service";

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [EsbBackendConfig],
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
  controllers: [EsbController],
  providers: [
    ApplicationService,
    SlRedisService,
    EsbInboxService,
    EsbNotificationService,
    EsbOrderService,
    EsbTransactionService,
    EsbConfigIntegration,
    EsbInboxIntegration,
    EsbNotificationIntegration,
    EsbOrderIntegration,
    EsbTransactionIntegration,
    EsbProfileService,
    EsbProfileIntegration,
    LoggingInterceptor,
    ChannelService,
    AccountService,
  ],
  exports: [],
})
export class EsbModule {}
