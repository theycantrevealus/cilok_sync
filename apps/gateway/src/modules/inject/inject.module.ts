import { RedisDataMaster, RedisInject } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { InjectController } from '@/inject/controllers/inject.controller';
import {
  InjectCouponModel,
  InjectCouponModelSchema,
} from '@/inject/models/inject.coupon.model';
import {
  InjectPointModel,
  InjectPointModelSchema,
} from '@/inject/models/inject.point.model';
import { RedeemModel, RedeemModelSchema } from '@/inject/models/redeem.model';
import { InjectProcessor } from '@/inject/processors/inject.processor';
import { InjectService } from '@/inject/services/inject_service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

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
      { name: InjectCouponModel.name, schema: InjectCouponModelSchema },
      { name: InjectPointModel.name, schema: InjectPointModelSchema },
      { name: RedeemModel.name, schema: RedeemModelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
    ]),
    LoggingModule,
    HttpModule,
    BullModule.registerQueueAsync(RedisInject),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [InjectController],
  providers: [
    ApplicationService,
    InjectProcessor,
    ChannelService,
    AccountService,
    InjectService,
    SlRedisService,
  ],
  exports: [InjectService],
})
export class InjectModule {
  //
}
