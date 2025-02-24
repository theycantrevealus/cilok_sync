import applicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import {
  RedisDataMaster,
  RedisLocation,
  RedisSftp,
} from '@configs/redis/redis.module';
import {
  DeductPoint,
  DeductPointSchema,
} from '@deduct/models/deduct.point.model';
import { MerchantService } from '@deduct/services/merchant.service';
import { KeywordService } from '@gateway/keyword/services/keyword.service';
import { TransactionMasterService } from '@gateway/transaction/services/transaction_master/transaction_master.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import { SftpService } from '@sftp/sftp.service';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
import * as redisStore from 'cache-manager-ioredis';

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
import { CustomerModule } from '@/customer/customer.module';
import {
  CustomerBadge,
  CustomerBadgeSchema,
} from '@/customer/models/customer.badge.model';
import { Customer, CustomerSchema } from '@/customer/models/customer.model';
import {
  CustomerPoinHistory,
  CustomerPoinHistorySchema,
} from '@/customer/models/customer.poin.history.model';
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
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LocationService } from '@/location/services/location.service';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { Merchant, MerchantSchema } from '@/merchant/models/merchant.model';
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
import { PIC, PICSchema } from '@/pic/models/pic.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import {
  ProgramTemplist,
  ProgramTemplistSchema,
} from '@/program/models/program.templist.model';
import { ProgramModule } from '@/program/program.module';
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
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '../../prepaid-granular/models/prepaid_granular_log';
import { ExceptionHandler } from '../../utils/logger/handler';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import {
  AuctionBidder,
  AuctionBidderSchema,
} from './models/auction_bidder.model';

const listModel = [
  { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
  { name: Account.name, schema: AccountSchema },
  { name: Role.name, schema: RoleSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  {
    name: AccountCredentialLog.name,
    schema: AccountCredentialLogSchema,
  },
  { name: SftpConfig.name, schema: SftpConfigSchema },
  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },
  { name: StockThreshold.name, schema: StockThresholdSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: Location.name, schema: LocationSchema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: MerchantV2.name, schema: MerchantV2Schema },
  { name: Merchant.name, schema: MerchantSchema },
  { name: Lov.name, schema: LovSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Redeem.name, schema: RedeemSchema },
  { name: Bank.name, schema: BankSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: Customer.name, schema: CustomerSchema },
  { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: APILog.name, schema: APILogSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: DeductPoint.name, schema: DeductPointSchema },
  { name: InjectPoint.name, schema: InjectPointSchema },
  { name: RefundPoint.name, schema: RefundPointSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: AuctionBidder.name, schema: AuctionBidderSchema },
  { name: TransactionMaster.name, schema: TransactionMasterSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },
  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: PIC.name, schema: PICSchema },
  { name: LocationBucket.name, schema: LocationBucketSchema },
  { name: Donation.name, schema: DonationSchema },
  { name: TransactionDonation.name, schema: TransactionDonationSchema },
  { name: DonationProcess.name, schema: DonationProcessSchema },
  { name: Channel.name, schema: ChannelSchema },
  { name: InjectWhitelist.name, schema: InjectWhitelistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: InjectCoupon.name, schema: InjectCouponSchema },
  { name: StockSummary.name, schema: StockSummarySchema },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV == undefined
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [Environtment, applicationConfig, mongoConfig, coreBackendConfig],
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
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisLocation),
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
      KafkaConn.callback[0],
      KafkaConn.notification_general[0],
      KafkaConn.transaction_master[0],
      KafkaConn.deduct[0],
      KafkaConn.inject_point[0],
      KafkaConn.notification[0],
      KafkaConn.refund[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.callback[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.voucher[0],
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
          transports: WinstonCustomTransport[targetEnv].auction,
        };
      },
    }),
    HttpModule,
    CustomerModule,
    LovModule,
    ProgramModule,
    AccountModule,
  ],
  controllers: [AuctionController],
  providers: [
    AuctionService,
    ExceptionHandler,
    ApplicationService,
    NotificationContentService,
    SlconfigService,
    SlRedisService,
    AccountService,
    UtilsService,
    PointService,
    KeywordService,
    TransactionMasterService,
    EligibilityService,
    StockService,
    VoucherService,
    SftpService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    LocationService,
    DonationService,
    ChannelService,
    EsbProfileService,
    WhitelistService,
    PointFmcService,
    VoucherUpdateService,
    SchedulerRegistry,
    EsbProfileIntegration,
    MainCrmbService,
    MainCrmbIntegration,
    MerchantService,
  ],
  exports: [AuctionService],
})
export class AuctionModule {}
