import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import {
  RedisCampaign,
  RedisCustomer,
  RedisDataMaster,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
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
import {
  CampaignBroadcastSchedule,
  CampaignBroadcastScheduleSchema,
} from '@/campaign/models/campaign.broadcast.schedule.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import {
  CustomerBadge,
  CustomerBadgeSchema,
} from '@/customer/models/customer.badge.model';
import {
  CustomerBrand,
  CustomerBrandSchema,
} from '@/customer/models/customer.brand.model';
import { Customer, CustomerSchema } from '@/customer/models/customer.model';
import {
  CustomerTier,
  CustomerTierSchema,
} from '@/customer/models/customer.tier.model';
import {
  CustomerXBadge,
  CustomerXBadgeSchema,
} from '@/customer/models/customer.x.badge.model';
import { CustomerService } from '@/customer/services/customer.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
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
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import { CampaignControllerV2 } from './controllers/campaign.controller.v1';
import { CampaignLog, CampaignLogSchema } from './models/campaign.log.model.v1';
import { Campaign, CampaignSchema } from './models/campaign.model';
import {
  CampaignRecipient,
  CampaignRecipientSchema,
} from './models/campaign.recipient.model';
import { CampaignProcessor } from './processor/campaign.processor';
import { CampaignServiceV1 } from './services/campaign.service.v1';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      {
        name: CampaignBroadcastSchedule.name,
        schema: CampaignBroadcastScheduleSchema,
      },
      { name: CampaignLog.name, schema: CampaignLogSchema },

      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },

      { name: Lov.name, schema: LovSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisCampaign),
    BullModule.registerQueueAsync(RedisCustomer),
    LoggingModule,
    HttpModule,

    // TODO: Disable Connecto to Kafka
    ClientsModule.registerAsync([
      KafkaConn.campaign[0],

      KafkaConnProducer.campaign[0],
    ]),
  ],
  controllers: [CampaignControllerV2],
  providers: [
    ApplicationService,
    SlRedisService,
    CampaignServiceV1,
    LoggingInterceptor,
    AccountService,
    ChannelService,
    CustomerService,

    // TODO: Disable running conjobs on gateway
    // CampaignProcessor,
  ],
  exports: [CampaignServiceV1],
})
export class CampaignModule {
  constructor() {
    console.log('Loaded');
  }
}
