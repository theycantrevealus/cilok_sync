import CrmBackendConfig from '@configs/crm-backend.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisCustomer, RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';

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
import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  ExternalBonusLog,
  ExternalBonusLogSchema,
} from '@/application/models/external-bonus.model';
import {
  NotificationLog,
  NotificationLogSchema,
} from '@/application/models/notification.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
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
import { CustomerXBadge, CustomerXBadgeSchema } from '@/customer/models/customer.x.badge.model';
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
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import {
  ProgramApprovalLog,
  ProgramApprovalLogSchema,
} from '@/program/models/program.approval.log';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { RemedyToolsController } from '@/remedy_tools/controllers/remedy.tools.controller';
import { RemedyToolsService } from '@/remedy_tools/service/remedy.tools.service';
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/transaction/models/inject.coupon.model';
import {
  VerificationVoucher,
  VerificationVoucherSchema,
} from '@/transaction/models/voucher/verification.voucher.model';
import { RemedyToolsVersion2Controller } from './controllers/remedy.tools.v2.controller';
import { InjectCouponSummary, InjectCouponSummarySchema } from '@/transaction/models/inject-coupon-summary.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [CrmBackendConfig],
    }),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Role.name, schema: RoleSchema },
      { name: ExternalBonusLog.name, schema: ExternalBonusLogSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: TransactionMaster.name, schema: TransactionMasterSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
    ]),
    MongooseModule.forRootAsync({
      connectionName: 'reporting',
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo_reporting.uri'),
        dbName: configService.get<string>('mongo_reporting.db-name'),
        user: configService.get<string>('mongo_reporting.db-user'),
        pass: configService.get<string>('mongo_reporting.db-password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [
        { name: InjectCouponSummary.name, schema: InjectCouponSummarySchema },
      ],
      'reporting',
    ),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisCustomer),
    LoggingModule,
    AccountModule,
    HttpModule,
    ClientsModule.registerAsync([
      KafkaConn.notification_general[0],
      KafkaConnProducer.notification_general[0],
    ]),
  ],
  controllers: [RemedyToolsController, RemedyToolsVersion2Controller],
  providers: [
    ApplicationService,
    SlRedisService,
    RemedyToolsService,
    AccountService,
    ChannelService,
    LoggingInterceptor,
    MainCrmbService,
    MainCrmbIntegration,
    CallApiConfigService,
    CustomerService,
    LovService,
  ],
  exports: [],
})
export class RemedyToolsModule {}
