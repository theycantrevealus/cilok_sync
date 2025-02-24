import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
} from '@configs/redis/redis.module';
import { MerchantService } from '@deduct/services/merchant.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import * as redisStore from 'cache-manager-ioredis';

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
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
// import { KeywordModule } from '@/keyword/keyword.module';
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
import {
  KeywordEligibility,
  KeywordEligibilitySchema,
} from '@/keyword/models/keyword.eligibility.model';
import {
  KeywordEmployeeNumber,
  KeywordEmployeeNumberSchema,
} from '@/keyword/models/keyword.employee.number.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import {
  KeywordShift,
  KeywordShiftSchema,
} from '@/keyword/models/keyword.shift.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LocationService } from '@/location/services/location.service';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  MerchantV2,
  MerchantV2Schema,
} from '@/merchant/models/merchant.model.v2';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';
import { PIC, PICSchema } from '@/pic/models/pic.model';
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
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  CallbackPostpaid,
  PostpaidCallbackSchema,
} from '@/transaction/models/callback/postpaid.callback.model';
import {
  CallbackPrepaid,
  PrepaidCallbackSchema,
} from '@/transaction/models/callback/prepaid.callback.model';

import { ExceptionHandler } from '../../utils/logger/handler';
import { WinstonModule } from '../../utils/logger/module';
import { WinstonCustomTransport } from '../../utils/logger/transport';
import EsbBackendConfig from './configs/esb-backend.config';
import LinkAjaBackendConfig from './configs/link-aja-backend.config';
import { EsbNgrsIntegration } from './esb/integration/esb.ngrs.recharge.integration';
import { EsbOrderIntegration } from './esb/integration/esb.order.integration';
import { EsbNgrsService } from './esb/services/esb.ngrs.service';
import { EsbOrderService } from './esb/services/esb.order.service';
import { ExternalBonusController } from './external-bonus.controller';
import { ExternalBonusService } from './external-bonus.service';
import { AdjustCustomerPointIntegration } from './linkaja/integration/adjust.customer.point.integration';
import { AssignVoucherIntegration } from './linkaja/integration/assign.voucher.integration';
import { MainBalanceIntegration } from './linkaja/integration/main.balance.integration';
import {
  AdjustCustomerPoint,
  AdjustCustomerPointSchema,
} from './linkaja/models/adjust.customer.point.model';
import { AdjustCustomerPointService } from './linkaja/services/adjust.customer.point.service';
import { AssignVoucherService } from './linkaja/services/assign.voucher.service';
import { MainBalanceService } from './linkaja/services/main.balance.service';
@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [EsbBackendConfig, mongoConfig, LinkAjaBackendConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db-name'),
        user: configService.get<string>('mongo.db-user'),
        pass: configService.get<string>('mongo.db-password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: AdjustCustomerPoint.name, schema: AdjustCustomerPointSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: ExternalBonusLog.name, schema: ExternalBonusLogSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Lov.name, schema: LovSchema },
      { name: PIC.name, schema: PICSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },

      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: Location.name, schema: LocationSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordEmployeeNumber.name, schema: KeywordEmployeeNumberSchema },
      { name: KeywordShift.name, schema: KeywordShiftSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },

      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: CallbackPrepaid.name, schema: PrepaidCallbackSchema },
      { name: CallbackPostpaid.name, schema: PostpaidCallbackSchema },
    ]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const targetEnv: string =
          !process.env.NODE_ENV ||
          process.env.NODE_ENV === '' ||
          process.env.NODE_ENV === 'development'
            ? 'development'
            : process.env.NODE_ENV;
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          handleRejections: true,
          handleExceptions: true,
          transports: WinstonCustomTransport[targetEnv].outbound,
        };
      },
    }),
    ClientsModule.registerAsync([
      KafkaConn.outbound[0],
      KafkaConn.inbound[0],
      KafkaConn.notification[0],
      KafkaConn.refund[0],
      KafkaConn.notification_general[0],

      KafkaConnProducer.outbound[0],
      KafkaConnProducer.inbound[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.notification_general[0],
    ]),
    // KeywordModule,

    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync({
      name: 'location-queue',
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('redis.host'),
          port: configService.get<string>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          isGlobal: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [ExternalBonusController],
  providers: [
    ApplicationService,
    EsbOrderIntegration,
    AdjustCustomerPointIntegration,
    MainBalanceService,
    MainBalanceIntegration,
    AssignVoucherIntegration,
    AssignVoucherService,
    EsbNgrsIntegration,
    ExternalBonusService,
    EsbOrderService,
    AdjustCustomerPointService,
    EsbNgrsService,
    NotificationContentService,
    MerchantService,
    CallApiConfigService,
    ExceptionHandler,
    LovService,
    ProgramServiceV2,
    LocationService,
    AccountService,
    NotificationService,
    TransactionOptionalService,
    // SchedulerRegistry,
    SlconfigService,
    SlRedisService,
  ],
})
export class ExternalBonusModule {}
