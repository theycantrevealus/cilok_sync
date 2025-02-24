import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisDataMaster, RedisProgram } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
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
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import { Location, LocationSchema } from '@/location/models/location.model';
import {
  LocationTemp,
  LocationTempSchema,
} from '@/location/models/location.temp.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';
import { ProgramControllerV2 } from '@/program/controllers/program.controller.v2';
import {
  ProgramApprovalLog,
  ProgramApprovalLogSchema,
} from '@/program/models/program.approval.log';
import {
  ProgramBlacklist,
  ProgramBlacklistSchema,
} from '@/program/models/program.blacklist.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import {
  ProgramNotification,
  ProgramNotificationSchema,
} from '@/program/models/program.notification.model.v2';
import {
  ProgramSegmentation,
  ProgramSegmentationSchema,
} from '@/program/models/program.segmentation.model';
import {
  ProgramTemplist,
  ProgramTemplistSchema,
} from '@/program/models/program.templist.model';
import {
  ProgramWhitelist,
  ProgramWhitelistSchema,
} from '@/program/models/program.whitelist.model';
import { ProgramProcessor } from '@/program/processors/program.processor';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { ProgramControllerV3 } from './controllers/program.controller.v3';
import { ProgramServiceV3 } from './services/program.service.v3';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: Location.name, schema: LocationSchema },
      { name: LocationTemp.name, schema: LocationTempSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.notification_general[0],
      KafkaConnProducer.notification_general[0],
    ]),
    LoggingModule,
    HttpModule,
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisDataMaster),
    LovModule,
  ],
  controllers: [ProgramControllerV2, ProgramControllerV3],
  providers: [
    ApplicationService,
    ProgramProcessor,
    ChannelService,
    AccountService,
    ProgramServiceV2,
    NotificationService,
    ProgramServiceV3,
    NotificationContentService,
    LovService,
    TransactionOptionalService,
    SlconfigService,
    SlRedisService,
  ],
  exports: [
    ProgramServiceV2,
    NotificationService,
    LovService,
    TransactionOptionalService,
  ],
})
export class ProgramModule {
  //
}
