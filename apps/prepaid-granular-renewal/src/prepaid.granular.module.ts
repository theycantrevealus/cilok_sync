import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import KafkaConfig from '@configs/kafka.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
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
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '@prepaid_granular/models/prepaid_granular_log';
import {
  PrepaidGranularTransaction,
  PrepaidGranularTransactionSchema,
} from '@prepaid_granular/models/prepaid-granular-transaction.model';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import { SftpService } from '@sftp/sftp.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
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
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
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
import { EsbProfileIntegration } from '@/esb/integration/esb.profile.integration';
import { EsbProfileService } from '@/esb/services/esb.profile.service';
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
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LocationService } from '@/location/services/location.service';
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
import {
  StockSummary,
  StockSummarySchema,
} from '@/stock/models/stocks-summary.model';
import { StockService } from '@/stock/services/stock.service';
import { Bid, BidSchema } from '@/transaction/models/bid/bid.model';
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
  DeductPoint,
  DeductPointSchema,
} from '@/transaction/models/point/deduct.point.model';
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
import {
  MaxRedeemThresholds,
  MaxRedeemThresholdsSchema,
} from '@/transaction/models/redeem/max_redeem.treshold.model';
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
import { DonationService } from '@/transaction/services/donation/donation.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { PointService } from '@/transaction/services/point/point.service';
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';
import { TransactionModule } from '@/transaction/transaction.module';
import { Vote, VoteSchema } from '@/vote/models/vote.model';
import { VoteOption, VoteOptionSchema } from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from '@/vote/models/vote_transaction.model';
import { VoteService } from '@/vote/services/vote.service';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import { Environtment } from '../../batch/src/configs/environtment';
import {
  KafkaMbseConsumerLogs,
  KafkaMbseConsumerLogsSchema,
} from '../models/kafka_mbse_consumer_logs';
import { SlIntegration } from './integration/sl.integration';
import { PrepaidGranularController } from './prepaid.granular.controller';
import { PrepaidGranularService } from './prepaid.granular.service';

@Module({
  imports: [
    HttpModule,
    ClientsModule.registerAsync([
      KafkaConn.notification_general[0],
      KafkaConn.transaction_master[0],
      KafkaConn.deduct[0],
      KafkaConn.inject_point[0],
      KafkaConn.notification[0],
      KafkaConn.refund[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.sftp[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,

      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        CoreBackendConfig,
        KafkaConfig,
      ],
    }),
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
          transports:
            WinstonCustomTransport[targetEnv].prepaid_granular_renewal,
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
      { name: Keyword.name, schema: KeywordSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
      { name: KafkaMbseConsumerLogs.name, schema: KafkaMbseConsumerLogsSchema },
      { name: Bid.name, schema: BidSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
      { name: Location.name, schema: LocationSchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: Bank.name, schema: BankSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: Stock.name, schema: StockSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: StockSummary.name, schema: StockSummarySchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },
      { name: SftpConfig.name, schema: SftpConfigSchema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: RefundPoint.name, schema: RefundPointSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: PIC.name, schema: PICSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: Donation.name, schema: DonationSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
      { name: VoucherBatch.name, schema: VoucherBatchSchema },
      { name: VoucherImport.name, schema: VoucherImportSchema },
      { name: VoucherTask.name, schema: VoucherTaskSchema },
      { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
      {
        name: PrepaidGranularTransaction.name,
        schema: PrepaidGranularTransactionSchema,
      },
    ]),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisCustomer),
    TransactionModule,
  ],
  controllers: [PrepaidGranularController],
  providers: [
    PrepaidGranularService,
    SlIntegration,
    UtilsService,
    ChannelService,
    AccountService,
    ExceptionHandler,
    ApplicationService,
    SlRedisService,
    PointService,
    CustomerService,
    KeywordService,
    LovService,
    ProgramServiceV2,
    NotificationContentService,
    EligibilityService,
    NotificationService,
    StockService,
    SftpService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    LocationService,
    DonationService,
    EsbProfileService,
    PointFmcService,
    EsbProfileIntegration,
    MainCrmbService,
    MainCrmbIntegration,
  ],
})
export class PrepaidGranularModule {}
