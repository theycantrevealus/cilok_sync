import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import {
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@sftp/models/sftp.outgoing.log';
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
import { Channel } from 'diagnostics_channel';

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
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
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
import { KeywordModule } from '@/keyword/keyword.module';
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
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
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
import { PointDeductService } from '@/transaction/services/point/point.deduct.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { TransactionMasterService } from '@/transaction/services/transaction_master/transaction_master.service';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';
import { Vote, VoteSchema } from '@/vote/models/vote.model';
import { VoteOption, VoteOptionSchema } from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from '@/vote/models/vote_transaction.model';
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '../../prepaid-granular/models/prepaid_granular_log';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';
import { DeductPoint, DeductPointSchema } from './models/deduct.point.model';
import { MerchantService } from './services/merchant.service';

const listModel = [
  { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
  { name: AuctionBidder.name, schema: AuctionBidderSchema },
  { name: Account.name, schema: AccountSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Role.name, schema: RoleSchema },
  { name: DeductPoint.name, schema: DeductPointSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Lov.name, schema: LovSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },

  { name: InjectCoupon.name, schema: InjectCouponSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: DeductPoint.name, schema: DeductPointSchema },
  { name: RefundPoint.name, schema: RefundPointSchema },

  { name: Customer.name, schema: CustomerSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },

  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

  /**
   * Dependency PointService
   */
  { name: Location.name, schema: LocationSchema },
  { name: InjectPoint.name, schema: InjectPointSchema },
  { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },
  { name: APILog.name, schema: APILogSchema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: Location.name, schema: LocationSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: Bank.name, schema: BankSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: TransactionMaster.name, schema: TransactionMasterSchema },
  { name: Redeem.name, schema: RedeemSchema },
  { name: Merchant.name, schema: MerchantSchema },
  { name: Account.name, schema: AccountSchema },
  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },
  { name: StockThreshold.name, schema: StockThresholdSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: SftpConfig.name, schema: SftpConfigSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },
  { name: PIC.name, schema: PICSchema },
  { name: LocationBucket.name, schema: LocationBucketSchema },
  { name: Donation.name, schema: DonationSchema },
  { name: TransactionDonation.name, schema: TransactionDonationSchema },
  { name: DonationProcess.name, schema: DonationProcessSchema },
  { name: Channel.name, schema: ChannelSchema },
  { name: InjectWhitelist.name, schema: InjectWhitelistSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },

  /**
   * End Dependency PointService
   */
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
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
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
      KafkaConn.refund[0],
      KafkaConn.deduct[0],
      KafkaConn.outbound[0],
      KafkaConn.void[0],
      KafkaConn.inbound[0],
      KafkaConn.notification[0],
      KafkaConn.voucher[0],
      KafkaConn.coupon[0],
      KafkaConn.transaction_master[0],
      KafkaConn.inject_point[0],
      KafkaConn.inject_point_high[0],
      KafkaConn.donation[0],
      KafkaConn.merchandise[0],
      KafkaConn.sftp[0],
      KafkaConn.reporting_point_event[0],
      KafkaConn.vote[0],
      KafkaConn.notification_general[0],
      KafkaConn.auction[0],

      KafkaConnProducer.refund[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.outbound[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.inbound[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.inject_point_high[0],
      KafkaConnProducer.donation[0],
      KafkaConnProducer.merchandise[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.reporting_point_event[0],
      KafkaConnProducer.vote[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.auction[0],
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
          transports: WinstonCustomTransport[targetEnv].deduct,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisLocation),
    HttpModule.register({}),
    KeywordModule,
    CustomerModule,
    LovModule,
  ],
  controllers: [KafkaController],
  providers: [
    KafkaService,
    ApplicationService,
    MerchantService,
    PointFmcService,
    NotificationContentService,
    SlconfigService,
    SlRedisService,
    ProgramServiceV2,
    TransactionOptionalService,
    CallApiConfigService,
    MainCrmbService,
    MainCrmbIntegration,
    AccountService,

    /**
     * Dependency PointService
     */
    PointDeductService,
    TransactionMasterService,
    EligibilityService,
    ExceptionHandler,
    LocationService,
    DonationService,
    ChannelService,
    EsbProfileService,
    WhitelistService,
    EsbProfileIntegration,
    /**
     * End Dependency PointService
     */
  ],
})
export class KafkaModule {}
