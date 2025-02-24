import { RedisDataMaster } from '@configs/redis/redis.module';
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
import { Location, LocationSchema } from '@/location/models/location.model';
import { LoggingModule } from '@/logging/logging.module';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
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
import { Stock, StockSchema } from '@/stock/models/stock.model';

import { VoteController } from './controllers/vote.controller';
import { Vote, VoteSchema } from './models/vote.model';
import { VoteOption, VoteOptionSchema } from './models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from './models/vote_transaction.model';
import { VoteService } from './services/vote.service';

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: Location.name, schema: LocationSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: Stock.name, schema: StockSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
    LovModule,
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [VoteController],
  providers: [
    ApplicationService,
    LovService,
    ChannelService,
    AccountService,
    VoteService,
    SlRedisService,
  ],
  exports: [VoteService],
})
export class VoteModule {}
