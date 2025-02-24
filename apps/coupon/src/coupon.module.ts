import applicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import * as redisStore from 'cache-manager-ioredis';

import { AccountModule } from '@/account/account.module';
import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@/cron/sftp/model/sftp.outgoing.log';
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
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import { KeywordService } from '@/keyword/services/keyword.service';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  MerchantV2,
  MerchantV2Schema,
} from '@/merchant/models/merchant.model.v2';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationModule } from '@/notification/notification.module';
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
import { ProgramModule } from '@/program/program.module';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { Stock, StockSchema } from '@/stock/models/stock.model';
import { StockModule } from '@/stock/stock.module';
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/transaction/models/inject.coupon.model';
import {
  CheckRedeem,
  CheckRedeemSchema,
} from '@/transaction/models/redeem/check.redeem.model';
import {
  MaxRedeemThresholds,
  MaxRedeemThresholdsSchema,
} from '@/transaction/models/redeem/max_redeem.treshold.model';
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
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';
import { VoucherUpdateService } from '@/transaction/services/voucher/voucher.update.service';
import { Vote, VoteSchema } from '@/vote/models/vote.model';
import { VoteOption, VoteOptionSchema } from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from '@/vote/models/vote_transaction.model';
import { VoteService } from '@/vote/services/vote.service';

import { ExceptionHandler } from '../../utils/logger/handler';
import {
  SftpConfig,
  SftpConfigSchema,
} from './../../sftp/src/models/sftp.config.model';
import { SftpService } from './../../sftp/src/sftp.service';
import { CouponController } from './coupon.controller';
import { KafkaCouponService } from './coupon.service';
import { InjectCouponService } from './service/inject.coupon.service';
import { CouponLogService } from './service/log.service';

const listModel = [
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: InjectCoupon.name, schema: InjectCouponSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: Location.name, schema: LocationSchema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: Lov.name, schema: LovSchema },

  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: MerchantV2.name, schema: MerchantV2Schema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: Bank.name, schema: BankSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: CustomerTier.name, schema: CustomerTierSchema },
  { name: CustomerBrand.name, schema: CustomerBrandSchema },
  { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: SftpConfig.name, schema: SftpConfigSchema },
  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },

  { name: Stock.name, schema: StockSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
];

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, MongoConfig, CoreBackendConfig, applicationConfig],
    }),
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
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisSftp),
    ClientsModule.registerAsync([
      KafkaConn.coupon[0],
      KafkaConn.notification[0],
      KafkaConn.deduct[0],
      KafkaConn.refund[0],
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],
      KafkaConn.transaction_master[0],

      KafkaConnProducer.coupon[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.transaction_master[0],
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
          transports: WinstonCustomTransport[targetEnv].coupon,
        };
      },
    }),
    StockModule,
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
          transports: WinstonCustomTransport[targetEnv].coupon,
        };
      },
    }),
    AccountModule,
    ProgramModule,
    NotificationModule,
    LovModule,
  ],
  controllers: [CouponController],
  providers: [
    ApplicationService,
    KafkaCouponService,
    InjectCouponService,
    NotificationContentService,
    ExceptionHandler,

    CouponLogService,

    SlconfigService,
    SlRedisService,
    KeywordService,
    CustomerService,
    ProgramServiceV2,
    VoucherService,
    SftpService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoucherUpdateService,
    SchedulerRegistry,
    VoteService,
  ],
})
export class CouponModule {}
