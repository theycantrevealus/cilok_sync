import applicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import esbBackendConfig from '@configs/esb-backend.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import redisConfig from '@configs/redis.config';
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
import { ScheduleModule } from '@nestjs/schedule';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
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
  BatchProcessLog,
  BatchProcessLogSchema,
} from '@/application/models/batch.log.model';
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
import { EsbModule } from '@/esb/esb.module';
import { EsbProfileIntegration } from '@/esb/integration/esb.profile.integration';
import { EsbProfileService } from '@/esb/services/esb.profile.service';
import { RedeemModel, RedeemModelSchema } from '@/inject/models/redeem.model';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
import {
  KeywordEligibility,
  KeywordEligibilitySchema,
} from '@/keyword/models/keyword.eligibility.model';
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
import { LocationService } from '@/location/services/location.service';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantSchema } from '@/merchant/models/merchant.model';
import {
  MerchantV2,
  MerchantV2Schema,
} from '@/merchant/models/merchant.model.v2';
import {
  MerchantOutlet,
  MerchantOutletSchema,
} from '@/merchant/models/merchant.outlet.model';
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
import { OTPService } from '@/otp/services/otp.service';
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
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { Bid, BidSchema } from '@/transaction/models/bid/bid.model';
import {
  CallbackTransaction,
  CallbackTransactionSchema,
} from '@/transaction/models/callback/callback.transaction.model';
import {
  CallbackPrepaid,
  PrepaidCallbackSchema,
} from '@/transaction/models/callback/prepaid.callback.model';
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
  ProgramWinner,
  ProgramWinnerSchema,
} from '@/transaction/models/program/program.winner.model';
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
import {
  InjectWhitelist,
  InjectWhitelistSchema,
} from '@/transaction/models/whitelist/inject.whitelist.model';
import { DonationService } from '@/transaction/services/donation/donation.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { PointService } from '@/transaction/services/point/point.service';
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';
import { TransactionMasterService } from '@/transaction/services/transaction_master/transaction_master.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';
import { VoucherUpdateService } from '@/transaction/services/voucher/voucher.update.service';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';
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
import {
  Location,
  LocationSchema,
} from '../../location/src/models/location.model';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '../../prepaid-granular/models/prepaid_granular_log';
import { RedeemFmcService } from '../../redeem_fmc/src/redeem.fmc.service';
import {
  SftpConfig,
  SftpConfigSchema,
} from '../../sftp/src/models/sftp.config.model';
import { SftpService } from '../../sftp/src/sftp.service';
import { RedeemController } from './redeem.controller';
import { RedeemService } from './redeem.service';

const listModel = [
  { name: AuctionBidder.name, schema: AuctionBidderSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: APILog.name, schema: APILogSchema },
  { name: Account.name, schema: AccountSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Bank.name, schema: BankSchema },
  { name: Role.name, schema: RoleSchema },
  { name: Channel.name, schema: ChannelSchema },

  { name: Customer.name, schema: CustomerSchema },
  { name: CustomerTier.name, schema: CustomerTierSchema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: CustomerBrand.name, schema: CustomerBrandSchema },
  { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
  { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },

  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: Location.name, schema: LocationSchema },
  { name: Lov.name, schema: LovSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: PIC.name, schema: PICSchema },
  { name: LocationBucket.name, schema: LocationBucketSchema },

  { name: InjectCoupon.name, schema: InjectCouponSchema },
  { name: InjectPoint.name, schema: InjectPointSchema },
  { name: DeductPoint.name, schema: DeductPointSchema },
  { name: RefundPoint.name, schema: RefundPointSchema },
  { name: ProgramWinner.name, schema: ProgramWinnerSchema },
  { name: Redeem.name, schema: RedeemSchema },
  { name: RedeemModel.name, schema: RedeemModelSchema },
  { name: CallbackTransaction.name, schema: CallbackTransactionSchema },
  { name: CallbackPrepaid.name, schema: PrepaidCallbackSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: InjectWhitelist.name, schema: InjectWhitelistSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },

  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },

  { name: BatchProcessLog.name, schema: BatchProcessLogSchema },
  { name: Donation.name, schema: DonationSchema },

  { name: Merchant.name, schema: MerchantSchema },
  { name: TransactionDonation.name, schema: TransactionDonationSchema },
  { name: DonationProcess.name, schema: DonationProcessSchema },

  { name: Voucher.name, schema: VoucherSchema },
  { name: MerchantV2.name, schema: MerchantV2Schema },
  { name: MerchantOutlet.name, schema: MerchantOutletSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },
  { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
  { name: OTP.name, schema: OTPSchema },
  { name: Bid.name, schema: BidSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
  { name: SftpConfig.name, schema: SftpConfigSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },

  { name: Authorization.name, schema: AuthorizationSchema },
  { name: TransactionMaster.name, schema: TransactionMasterSchema },
  { name: StockThreshold.name, schema: StockThresholdSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },

  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: StockSummary.name, schema: StockSummarySchema },
  { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        applicationConfig,
        mongoConfig,
        redisConfig,
        coreBackendConfig,
        esbBackendConfig,
      ],
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
        // user: configService.get<string>('mongo.db-user'),
        // pass: configService.get<string>('mongo.db-password'),
        tlsAllowInvalidCertificates: configService.get<boolean>(
          'mongo.tls_allow_invalid_certificates',
        ),
        tls: configService.get<boolean>('mongo.tls'),
        authSource: configService.get<string>('mongo.auth_source'),
        directConnection: configService.get<boolean>('mongo.direct_connection'),
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
        // user: configService.get<string>('mongo.db-user'),
        // pass: configService.get<string>('mongo.db-password'),
        tlsAllowInvalidCertificates: configService.get<boolean>(
          'mongo_secondary.tls_allow_invalid_certificates',
        ),
        tls: configService.get<boolean>('mongo_secondary.tls'),
        authSource: configService.get<string>('mongo_secondary.auth_source'),
        directConnection: configService.get<boolean>(
          'mongo_secondary.direct_connection',
        ),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(listModel),
    MongooseModule.forFeature(listModel, 'secondary'),
    ClientsModule.registerAsync([
      KafkaConn.eligibility[0],
      KafkaConn.voucher[0],
      KafkaConn.transaction_master[0],
      KafkaConn.deduct[0],
      KafkaConn.inject_point[0],
      KafkaConn.refund[0],
      KafkaConn.void[0],
      KafkaConn.notification[0],
      KafkaConn.notification_general[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.eligibility[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.sftp[0],
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
          transports: WinstonCustomTransport[targetEnv].redeem,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisDataMaster),
    HttpModule,
    EsbModule,
  ],
  controllers: [RedeemController],
  providers: [
    OTPService,
    DonationService,
    PointService,
    ChannelService,
    VoucherService,
    AccountService,
    StockService,
    ApplicationService,
    NotificationService,
    KeywordService,
    LoggingInterceptor,
    RedeemService,
    CustomerService,
    ProgramServiceV2,
    LovService,
    TransactionOptionalService,
    TransactionMasterService,
    LocationService,
    SftpService,
    CallApiConfigService,
    NotificationContentService,
    EligibilityService,
    WhitelistService,
    // TransactionRecoveryService,
    ExceptionHandler,
    SlconfigService,
    SlRedisService,
    MaxRedeemTresholdsService,
    VoucherUpdateService,
    PointFmcService,
    RedeemFmcService,
    MainCrmbService,
    MainCrmbIntegration,
    VoucherUpdateService,
    EsbProfileIntegration,
    EsbProfileService,
    VoteService,
  ],
})
export class RedeemModule {}
