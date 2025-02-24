import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisDataMaster, RedisProgram } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNSchema,
} from '@reporting_statistic/model/unique_msisdn/unique.msisdn.daily.model';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
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
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import { LocationModule } from '@/location/location.module';
import { Location, LocationSchema } from '@/location/models/location.model';
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
import { StockModule } from '@/stock/stock.module';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  VerificationVoucher,
  VerificationVoucherSchema,
} from '@/transaction/models/voucher/verification.voucher.model';
import {
  VoucherBatch,
  VoucherBatchSchema,
} from '@/transaction/models/voucher/voucher.batch.model';
import {
  VoucherImport,
  VoucherImportSchema,
} from '@/transaction/models/voucher/voucher.import.model';
import {
  Voucher,
  VoucherSchema,
} from '@/transaction/models/voucher/voucher.model';
import {
  VoucherTask,
  VoucherTaskSchema,
} from '@/transaction/models/voucher/voucher.task.model';
import {
  VoucherUpdate,
  VoucherUpdateSchema,
} from '@/transaction/models/voucher/voucher.update.model';
import { VoucherService as TransactionVoucherService } from '@/transaction/services/voucher/voucher.service';
import { VoucherUpdateService } from '@/transaction/services/voucher/voucher.update.service';

import ApplicationConfig from './configs/application.config';
import CoreBackendConfig from './configs/core-backend.config';
import { Environtment } from './configs/environtment';
import MongoConfig from './configs/mongo.config';
import RedisConfig from './configs/redis.config';
import { MerchantService } from './services/merchant.service';
import { VoucherController } from './voucher.kafka.controller';
import { VoucherService } from './voucher.kafka.service';
import { VoucherLogService } from './voucher.log.service';

const listModel = [
  { name: ReportUniqueMSISDN.name, schema: ReportUniqueMSISDNSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Lov.name, schema: LovSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: Authorization.name, schema: AuthorizationSchema },

  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
  { name: Location.name, schema: LocationSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: Account.name, schema: AccountSchema },
  { name: Role.name, schema: RoleSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },

  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
];

@Module({
  imports: [
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
      ],
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
    MongooseModule.forRootAsync({
      connectionName: 'secondary',
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo_secondary.uri'),
        dbName: configService.get<string>('mongo_secondary.db-name'),
        user: configService.get<string>('mongo_secondary.db-user'),
        pass: configService.get<string>('mongo_secondary.db-password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(listModel),
    MongooseModule.forFeature(listModel, 'secondary'),
    ClientsModule.registerAsync([
      KafkaConn.notification[0],
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.refund[0],

      KafkaConnProducer.notification[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.reporting_statistic[0],
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
          transports: WinstonCustomTransport[targetEnv].voucher,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisDataMaster),
    HttpModule,
    StockModule,
    LocationModule,
  ],
  controllers: [VoucherController],
  providers: [
    VoucherUpdateService,
    VoucherService,
    ApplicationService,
    NotificationContentService,
    TransactionVoucherService,
    TransactionOptionalService,
    ExceptionHandler,
    LovService,
    ProgramServiceV2,
    AccountService,
    NotificationService,
    VoucherLogService,
    MerchantService,
    SlconfigService,
    SlRedisService,
    CallApiConfigService,
  ],
})
export class VoucherModule {}
