import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AccountModule } from '../account/account.module';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '../account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '../account/models/account.location.model';
import { Account, AccountSchema } from '../account/models/account.model';
import { Role, RoleSchema } from '../account/models/role.model';
import { AccountService } from '../account/services/account.service';
import { Channel, ChannelSchema } from '../channel/models/channel.model';
import { ChannelService } from '../channel/services/channel.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { LoggingModule } from '../logging/logging.module';
import { APILog, APILogSchema } from '../logging/models/api.logs.model';
import { PartnerController } from './controllers/partner.controller';
import { Partner, PartnerSchema } from './models/partner.model';
import { PartnerService } from './services/partner.service';
import { Authorization, AuthorizationSchema } from '../account/models/authorization.model';
import { SystemConfig, SystemConfigSchema } from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { ApplicationService } from "@/application/services/application.service";
import { SlRedisService } from "@slredis/slredis.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: Partner.name, schema: PartnerSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    LoggingModule,
    AccountModule,
    HttpModule,
  ],
  controllers: [PartnerController],
  providers: [
    ApplicationService,
    SlRedisService,
    PartnerService,
    ChannelService,
    LoggingInterceptor,
    AccountService,
  ],
  exports: [PartnerService],
})
export class PartnerModule {
  //
}
