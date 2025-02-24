import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import {
  DeductPoint,
  DeductPointSchema,
} from '@deduct/models/deduct.point.model';
import { ReportingUniqueMsisdnMyTselService } from '@fmc_reporting_statistic/services/unique-msisdn/reporting-unique-msisdn-mytsel.service';
import { Channel, ChannelSchema } from '@gateway/channel/models/channel.model';
import {
  ReportTrendChannelRedeemer,
  ReportTrendChannelRedeemerSchema,
} from '@gateway/report/models/report-trend-channel-redeemer.model';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  CustomerMostRedeem,
  CustomerMostRedeemSchema,
} from '@reporting_statistic/model/reward-catalog/customer-most-redeem.model';
import { PersonalizedRewardCatalogService } from '@reporting_statistic/services/reward-catalog/personalized-reward-catalog.service';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@sftp/models/sftp.outgoing.log';
import { SftpService } from '@sftp/sftp.service';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
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
// import { TimeManagement } from '@/application/utils/Time/timezone';
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
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
// import { Merchant, MerchantSchema } from '@/merchant/models/merchant.model';
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
// import {
//   ProgramApprovalLog,
//   ProgramApprovalLogSchema,
// } from '@/program/models/program.approval.log';
// import {
//   ProgramBlacklist,
//   ProgramBlacklistSchema,
// } from '@/program/models/program.blacklist.model';
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
// import {
//   ProgramNotification,
//   ProgramNotificationSchema,
// } from '@/program/models/program.notification.model';
// import {
//   ProgramSegmentation,
//   ProgramSegmentationSchema,
// } from '@/program/models/program.segmentation.model';
// import {
//   ProgramTemplist,
//   ProgramTemplistSchema,
// } from '@/program/models/program.templist.model';
// import {
//   ProgramWhitelist,
//   ProgramWhitelistSchema,
// } from '@/program/models/program.whitelist.model';
// import { ProgramServiceV2 } from '@/program/services/program.service.v2';
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
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/transaction/models/inject.coupon.model';
import {
  InjectCouponSummary,
  InjectCouponSummarySchema,
} from '@/transaction/models/inject-coupon-summary.model';
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

import {
  CronConfig,
  CronConfigSchema,
} from '../../cron/src/models/cron.config.model';
import {
  ReportUniqueChannelTrendsSystem,
  ReportUniqueChannelTrendsSystemSchema,
} from './model/channel_trends/unique.channel.trends.model';
import {
  ReportErrorRedeemerTrends,
  ReportErrorRedeemerTrendsSchema,
} from './model/error-redeemer-trends/error.redeemer.trends.model';
import {
  ReportErrorRedeemerTrendsSummary,
  ReportErrorRedeemerTrendsSummarySchema,
} from './model/error-redeemer-trends/error.redeemer.trends.summary.model';
import {
  ReportTrendErrorRedeem,
  ReportTrendErrorRedeemSchema,
} from './model/error-redeemer-trends/report-trend-error-redeem.model';
import {
  ReportFactDetail,
  ReportFactDetailSchema,
} from './model/fact-detail/report-fact-detail.model';
import {
  ReportKeywordTransaction,
  ReportKeywordTransactionSchema,
} from './model/keyword-transaction/report-keyword-transaction.model';
import {
  LocationPrefix,
  LocationPrefixSchema,
} from './model/location-prefix/location-prefix.mode';
import {
  ReportProgramHistory,
  ReportProgramHistorySchema,
} from './model/program/unique.program.history.model';
import {
  ReportRedeemTransaction,
  ReportRedeemTransactionSchema,
} from './model/redeem-transaction/redeem-transaction.model';
import {
  ReportMonitoring,
  ReportMonitoringSchema,
} from './model/reporting.model';
import {
  ReportUniqueRewardLiveSystem,
  ReportUniqueRewardLiveSystemSchema,
} from './model/reward/unique.reward.live.system.model';
import {
  ReportUniqueRewardTransaction,
  ReportUniqueRewardTransactionSchema,
} from './model/reward/unique.reward.transaction.model';
import {
  TransactionMasterDetail,
  TransactionMasterDetailSchema,
} from './model/trx-master-detail.model';
import {
  CouponGenerateUniqueMsisdn,
  CouponGenerateUniqueMsisdnSchema,
} from './model/unique_msisdn/coupon.generate.unique.msisdn.daily.model';
import {
  MsisdnRedeemTransactionTemp,
  MsisdnRedeemTransactionTempSchema,
} from './model/unique_msisdn/msisdn.redeem.transaction.temp';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNSchema,
} from './model/unique_msisdn/unique.msisdn.daily.model';
import {
  MonthlyReportUniqueMSISDN,
  MonthlyReportUniqueMSISDNSchema,
} from './model/unique_msisdn/unique.msisdn.monthly.model';
import {
  YearlyReportUniqueMSISDN,
  YearlyReportUniqueMSISDNSchema,
} from './model/unique_msisdn/unique.msisdn.yearly.model';
import { ReportingStatisticController } from './reporting_statistic.controller';
import { ReportingStatisticService } from './reporting_statistic.service';
import { ReportingTrendsChannelService } from './services/channel_trends/reporting-channel-trends.service';
import { CouponSummaryService } from './services/coupon/coupon-summary.service';
import { ReportingErrorRedeemerTrendsService } from './services/error-redeemer-trends/error-redeemer-trends.service';
import { ReportTrendErrorRedeemService } from './services/error-redeemer-trends/report-trend-error-redeem.service';
import { ReportingFactDetailService } from './services/fact-detail/reporting-fact-detail.service';
import { GrossRevenueService } from './services/gross-revenue/gross_revenue.service';
import { GrossRevenueTotalService } from './services/gross-revenue/gross_revenue_total.service';
import { ReportKeywordWithStockService } from './services/keyword_with_stocks/keyword_with_stocks.service';
import { AlertKeywordTobeExpiredService } from './services/keyword-transaction/alert-keyword-tobe-expired.service';
import { ReportKeywordTransactionService } from './services/keyword-transaction/report-keyword-transaction.service';
import { ReportingPoinBurningService } from './services/poin_burning/reporting-poin-burning.service';
import { ReportingPoinBurningMyTselService } from './services/poin_burning_mytsel/reporting-poin-burning-mytsel.service';
import { PoinEarnService } from './services/poin_earn/poin_earn.service';
import { PoinEarnRedeemerService } from './services/poin_earn_redeemer/poin_earn_redeemer.service';
import { PoinOwnerService } from './services/poin_owner/poin_owner.service';
import { ReportTransactionProgramService } from './services/program/report.transaction.program.service';
import { ReportingProgramHistoryService } from './services/program/reporting-program-history.service';
import { ReportingQuotaStockAlertService } from './services/quota-stock-daily/reporting-quota-stock-alert.service';
import { ReportingQuotaStockDailyService } from './services/quota-stock-daily/reporting-quota-stock-daily.service';
import { ReportRedeemTransactionService } from './services/redeem-transaction/redeem-transaction.service';
import { ReportRedeemerMyTselService } from './services/redeemer_mytsel/redeemer-mytsel.service';
import { ReportingNotificationService } from './services/reporting_notification/reporting-notification.service';
import { GeneralReportingCoreService } from './services/reporting-core/general-reporting-core.service';
import { RequestReportingCoreService } from './services/reporting-core/request-reporting-core.service';
import { ReportingSftpService } from './services/reporting-sftp/reporting-sftp.service';
import { ReportingRewardService } from './services/reward/reporting-reward.service';
import { RewardCatalogXMLService } from './services/reward-catalog/reward-catalog-xml.service';
import { ReportTransactionService } from './services/transaction/reporting-transaction.service';
import { ReportTransactionBurningMyTselService } from './services/transaction_burning_mytsel/transaction-burning-mytsel.service';
import { ReportingRedeemerExistingService } from './services/unique-msisdn/redeemer-existing.service';
import { ReportingGenerateCouponUniqueMsisdnService } from './services/unique-msisdn/reporting-generate-coupon-unique-msisdn.service';
import { ReportingUniqueMsisdnService } from './services/unique-msisdn/reporting-unique-msisdn.service';
import { VoucherExpiredTriggerService } from './services/voucher_expired/voucher_expired_trigger.service';

@Module({
  imports: [
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
    MongooseModule.forFeature([
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      // { name: ReportMonitoring.name, schema: ReportMonitoringSchema },
      // { name: ReportUniqueMSISDN.name, schema: ReportUniqueMSISDNSchema },
      // {
      //   name: MonthlyReportUniqueMSISDN.name,
      //   schema: MonthlyReportUniqueMSISDNSchema,
      // },
      // {
      //   name: YearlyReportUniqueMSISDN.name,
      //   schema: YearlyReportUniqueMSISDNSchema,
      // },

      // {
      //   name: ReportUniqueRewardTransaction.name,
      //   schema: ReportUniqueRewardTransactionSchema,
      // },
      // {
      //   name: ReportUniqueRewardLiveSystem.name,
      //   schema: ReportUniqueRewardLiveSystemSchema,
      // },

      {
        name: Keyword.name,
        schema: KeywordSchema,
      },
      {
        name: KeywordApprovalLog.name,
        schema: KeywordApprovalLogSchema,
      },
      // {
      //   name: ReportUniqueChannelTrendsSystem.name,
      //   schema: ReportUniqueChannelTrendsSystemSchema,
      // },
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Location.name, schema: LocationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      // {
      //   name: ReportTrendChannelRedeemer.name,
      //   schema: ReportTrendChannelRedeemerSchema,
      // },

      // {
      //   name: ReportErrorRedeemerTrends.name,
      //   schema: ReportErrorRedeemerTrendsSchema,
      // },
      // {
      //   name: ReportErrorRedeemerTrendsSummary.name,
      //   schema: ReportErrorRedeemerTrendsSummarySchema,
      // },
      // {
      //   name: ReportKeywordTransaction.name,
      //   schema: ReportKeywordTransactionSchema,
      // },
      { name: Channel.name, schema: ChannelSchema },
      // { name: ReportProgramHistory.name, schema: ReportProgramHistorySchema },
      // { name: ReportFactDetail.name, schema: ReportFactDetailSchema },
      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: Location.name, schema: LocationSchema },
      { name: PIC.name, schema: PICSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: Redeem.name, schema: RedeemSchema },
      // {
      //   name: CouponGenerateUniqueMsisdn.name,
      //   schema: CouponGenerateUniqueMsisdnSchema,
      // },
      // {
      //   name: MsisdnRedeemTransactionTemp.name,
      //   schema: MsisdnRedeemTransactionTempSchema,
      // },
      { name: Stock.name, schema: StockSchema },
      // {
      //   name: ReportRedeemTransaction.name,
      //   schema: ReportRedeemTransactionSchema,
      // },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      // {
      //   name: ReportTrendErrorRedeem.name,
      //   schema: ReportTrendErrorRedeemSchema,
      // },
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },
      {
        name: TransactionMaster.name,
        schema: TransactionMasterSchema,
      },
      {
        name: TransactionMasterDetail.name,
        schema: TransactionMasterDetailSchema,
      },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: Account.name, schema: AccountSchema },

      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      {
        name: CronConfig.name,
        schema: CronConfigSchema,
      },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      {
        name: LocationPrefix.name,
        schema: LocationPrefixSchema,
      },
      { name: CustomerMostRedeem.name, schema: CustomerMostRedeemSchema },
      {
        name: Vote.name,
        schema: VoteSchema,
      },
      {
        name: VoteOption.name,
        schema: VoteOptionSchema,
      },
      { name: StockSummary.name, schema: StockSummarySchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      {
        name: KeywordType.name,
        schema: KeywordTypeSchema,
      },
      {
        name: Bank.name,
        schema: BankSchema,
      },
      {
        name: Role.name,
        schema: RoleSchema,
      },
      {
        name: VoucherUpdate.name,
        schema: VoucherUpdateSchema,
      },
      {
        name: TransactionVote.name,
        schema: TransactionVoteSchema,
      },
      {
        name: CheckRedeem.name,
        schema: CheckRedeemSchema,
      },
      {
        name: MaxRedeemThresholds.name,
        schema: MaxRedeemThresholdsSchema,
      },
      {
        name: ProgramSegmentation.name,
        schema: ProgramSegmentationSchema,
      },
      {
        name: ProgramNotification.name,
        schema: ProgramNotificationSchema,
      },
      {
        name: ProgramApprovalLog.name,
        schema: ProgramApprovalLogSchema,
      },
      {
        name: ProgramTemplist.name,
        schema: ProgramTemplistSchema,
      },
      {
        name: ProgramWhitelist.name,
        schema: ProgramWhitelistSchema,
      },
      {
        name: ProgramBlacklist.name,
        schema: ProgramBlacklistSchema,
      },
      {
        name: SftpConfig.name,
        schema: SftpConfigSchema,
      },
      {
        name: VoucherTask.name,
        schema: VoucherTaskSchema,
      },
      {
        name: VoucherBatch.name,
        schema: VoucherBatchSchema,
      },
      {
        name: VoucherImport.name,
        schema: VoucherImportSchema,
      },
      {
        name: VerificationVoucher.name,
        schema: VerificationVoucherSchema,
      },
      {
        name: AccountLocation.name,
        schema: AccountLocationSchema,
      },
      {
        name: AccountCredentialLog.name,
        schema: AccountCredentialLogSchema,
      },
      {
        name: SftpOutgoingLog.name,
        schema: SftpOutgoingLogSchema,
      },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: InjectCouponSummary.name, schema: InjectCouponSummarySchema },
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
    MongooseModule.forFeature(
      [
        { name: ReportMonitoring.name, schema: ReportMonitoringSchema },
        {
          name: ReportUniqueChannelTrendsSystem.name,
          schema: ReportUniqueChannelTrendsSystemSchema,
        },
        {
          name: ReportTrendChannelRedeemer.name,
          schema: ReportTrendChannelRedeemerSchema,
        },
        {
          name: ReportErrorRedeemerTrends.name,
          schema: ReportErrorRedeemerTrendsSchema,
        },
        {
          name: ReportErrorRedeemerTrendsSummary.name,
          schema: ReportErrorRedeemerTrendsSummarySchema,
        },
        {
          name: ReportKeywordTransaction.name,
          schema: ReportKeywordTransactionSchema,
        },
        {
          name: ReportRedeemTransaction.name,
          schema: ReportRedeemTransactionSchema,
        },
        {
          name: ReportTrendErrorRedeem.name,
          schema: ReportTrendErrorRedeemSchema,
        },
        { name: ReportProgramHistory.name, schema: ReportProgramHistorySchema },
        { name: ReportFactDetail.name, schema: ReportFactDetailSchema },
        { name: ReportUniqueMSISDN.name, schema: ReportUniqueMSISDNSchema },
        {
          name: MonthlyReportUniqueMSISDN.name,
          schema: MonthlyReportUniqueMSISDNSchema,
        },
        {
          name: YearlyReportUniqueMSISDN.name,
          schema: YearlyReportUniqueMSISDNSchema,
        },

        {
          name: ReportUniqueRewardTransaction.name,
          schema: ReportUniqueRewardTransactionSchema,
        },
        {
          name: ReportUniqueRewardLiveSystem.name,
          schema: ReportUniqueRewardLiveSystemSchema,
        },
        {
          name: CouponGenerateUniqueMsisdn.name,
          schema: CouponGenerateUniqueMsisdnSchema,
        },
        {
          name: MsisdnRedeemTransactionTemp.name,
          schema: MsisdnRedeemTransactionTempSchema,
        },
        { name: StockThreshold.name, schema: StockThresholdSchema },
        {
          name: TransactionMaster.name,
          schema: TransactionMasterSchema,
        },
        {
          name: TransactionMasterDetail.name,
          schema: TransactionMasterDetailSchema,
        },
        { name: StockSummary.name, schema: StockSummarySchema },
        { name: InjectCoupon.name, schema: InjectCouponSchema },
        { name: InjectCouponSummary.name, schema: InjectCouponSummarySchema },
      ],
      'reporting',
    ),
    MongooseModule.forFeature(
      [{ name: Voucher.name, schema: VoucherSchema }],
      'secondary',
    ),
    HttpModule,
    ClientsModule.registerAsync([
      KafkaConn.reporting_statistic[0],
      KafkaConn.notification[0],
      KafkaConn.notification_general[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.reporting_statistic[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.voucher[0],
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
          transports: WinstonCustomTransport[targetEnv].reporting_statistic,
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
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisProgram),
  ],
  controllers: [ReportingStatisticController],
  providers: [
    CustomerService,
    ReportingStatisticService,
    ReportingNotificationService,
    ReportTransactionService,
    ReportingUniqueMsisdnService,
    ReportingRedeemerExistingService,
    ReportingRewardService,
    RewardCatalogXMLService,
    NotificationContentService,
    TransactionOptionalService,
    UtilsService,
    ReportingTrendsChannelService,
    ReportingFactDetailService,
    ReportingErrorRedeemerTrendsService,
    ReportingPoinBurningService,
    ReportKeywordTransactionService,
    ReportingQuotaStockDailyService,
    ReportingProgramHistoryService,
    ReportingPoinBurningMyTselService,
    ReportRedeemerMyTselService,
    ReportTransactionBurningMyTselService,
    LovService,
    LocationService,
    ChannelService,
    ReportingGenerateCouponUniqueMsisdnService,
    ReportingSftpService,
    ReportRedeemTransactionService,
    ReportKeywordWithStockService,
    ReportTrendErrorRedeemService,
    ReportTransactionProgramService,
    RequestReportingCoreService,
    GeneralReportingCoreService,
    GrossRevenueService,
    PoinOwnerService,
    PoinEarnRedeemerService,
    ReportingQuotaStockAlertService,
    ApplicationService,
    AlertKeywordTobeExpiredService,
    GrossRevenueTotalService,
    PoinEarnService,
    VoucherExpiredTriggerService,
    ExceptionHandler,
    StockService,
    ReportingUniqueMsisdnMyTselService,
    NotificationService,
    SlconfigService,
    SlRedisService,
    PersonalizedRewardCatalogService,
    KeywordService,
    AccountService,
    VoucherService,
    SftpService,
    ProgramServiceV2,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    VoucherUpdateService,
    SchedulerRegistry,
    CouponSummaryService,
  ],
})
export class ReportingStatisticModule {}
