import ApplicationConfig from '@configs/application.config';
import applicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import InjectConfig from '@configs/inject.config';
import KafkaConfig from '@configs/kafka.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import MongoConfig from '@configs/mongo.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import {
  DeductPoint,
  DeductPointSchema,
} from '@deduct/models/deduct.point.model';
import { HttpModule, HttpService } from '@nestjs/axios';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import * as redisStore from 'cache-manager-ioredis';
import { Channel } from 'diagnostics_channel';
import * as process from 'process';

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
  BatchProcessLog,
  BatchProcessLogSchema,
} from '@/application/models/batch.log.model';
import {
  BatchProcessRowLog,
  BatchProcessRowLogSchema,
} from '@/application/models/batch-row.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { ChannelSchema } from '@/channel/models/channel.model';
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
  CustomerPoinHistory,
  CustomerPoinHistorySchema,
} from '@/customer/models/customer.poin.history.model';
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
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantSchema } from '@/merchant/models/merchant.model';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';
import { OTP, OTPSchema } from '@/otp/models/otp.model';
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
import { Stock, StockSchema } from '@/stock/models/stock.model';
import { StockLogs, StockLogSchema } from '@/stock/models/stock-logs.model';
import {
  StockReserve,
  StockReserveSchema,
} from '@/stock/models/stock-reserve.model';
import {
  StockThreshold,
  StockThresholdSchema,
} from '@/stock/models/stock-threshold.model';
import { StockService } from '@/stock/services/stock.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  DonationProcess,
  DonationProcessSchema,
} from '@/transaction/models/donation/donation.logger.model';
import {
  Donation,
  DonationSchema,
} from '@/transaction/models/donation/donation.model';
import {
  TransactionDonation,
  TransactionDonationSchema,
} from '@/transaction/models/donation/transaction_donation.model';
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/transaction/models/inject.coupon.model';
import {
  InjectPoint,
  InjectPointSchema,
} from '@/transaction/models/point/inject.point.model';
import {
  RefundPoint,
  RefundPointSchema,
} from '@/transaction/models/point/refund.point.model';
import {
  CheckRedeem,
  CheckRedeemSchema,
} from '@/transaction/models/redeem/check.redeem.model';
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';
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
  VoucherTask,
  VoucherTaskSchema,
} from '@/transaction/models/voucher/voucher.task.model';
import {
  VoucherUpdate,
  VoucherUpdateSchema,
} from '@/transaction/models/voucher/voucher.update.model';
import { Coupon2Service } from '@/transaction/services/coupon/coupon2.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';
import { VoucherUpdateService } from '@/transaction/services/voucher/voucher.update.service';
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  SftpConfig,
  SftpConfigSchema,
} from '../../sftp/src/models/sftp.config.model';
import { SftpService } from '../../sftp/src/sftp.service';
import { ManualRedeemGoogleController } from './manual-redeem-google.controller';
import { ManualRedeemGoogleService } from './manual-redeem-google.service';
import { StockSummary, StockSummarySchema } from '@/stock/models/stocks-summary.model';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === undefined
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        applicationConfig,
        MongoConfig,
        InjectConfig,
        KafkaConfig,
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
    MongooseModule.forFeature([
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: Merchant.name, schema: MerchantSchema },

      { name: Account.name, schema: AccountSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: BatchProcessLog.name, schema: BatchProcessLogSchema },
      { name: BatchProcessRowLog.name, schema: BatchProcessRowLogSchema },

      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },

      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: Location.name, schema: LocationSchema },

      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },

      { name: Lov.name, schema: LovSchema },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: RefundPoint.name, schema: RefundPointSchema },

      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },

      { name: Stock.name, schema: StockSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },

      { name: StockReserve.name, schema: StockReserveSchema },
      { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Donation.name, schema: DonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: Bank.name, schema: BankSchema },
      { name: OTP.name, schema: OTPSchema },
      { name: VoucherBatch.name, schema: VoucherBatchSchema },
      { name: VoucherImport.name, schema: VoucherImportSchema },
      { name: VoucherTask.name, schema: VoucherTaskSchema },
      { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
      { name: SftpConfig.name, schema: SftpConfigSchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },

      { name: Authorization.name, schema: AuthorizationSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: StockSummary.name, schema: StockSummarySchema },

    ]),
    ClientsModule.registerAsync([
      KafkaConn.deduct[0],
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],
      KafkaConn.transaction_master[0],
      KafkaConn.coupon[0],
      KafkaConn.coupon_high[0],
      KafkaConn.coupon_low[0],

      KafkaConnProducer.deduct[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.coupon_high[0],
      KafkaConnProducer.coupon_low[0],
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
          transports: WinstonCustomTransport[targetEnv].manual_redeem_google,
        };
      },
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
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisSftp),
  ],
  controllers: [ManualRedeemGoogleController],
  providers: [
    ManualRedeemGoogleService,
    Coupon2Service,
    ProgramServiceV2,
    ConfigService,
    KeywordService,
    LovService,
    CustomerService,
    TransactionOptionalService,
    AccountService,
    ApplicationService,
    NotificationService,
    StockService,
    VoucherService,
    SftpService,
    ExceptionHandler,
    SlconfigService,
    SlRedisService,
    VoucherUpdateService
  ],
})
export class ManualRedeemGoogleModule {}
