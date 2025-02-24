import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import {
  RedisCampaign,
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import { MerchantService } from '@deduct/services/merchant.service';
import {
  ReportUniqueChannelTrendsSystem,
  ReportUniqueChannelTrendsSystemSchema,
} from '@fmc_reporting_statistic/model/channel_trends/unique.channel.trends.model';
import {
  ReportErrorRedeemerTrends,
  ReportErrorRedeemerTrendsSchema,
} from '@fmc_reporting_statistic/model/error-redeemer-trends/error.redeemer.trends.model';
import {
  ReportErrorRedeemerTrendsSummary,
  ReportErrorRedeemerTrendsSummarySchema,
} from '@fmc_reporting_statistic/model/error-redeemer-trends/error.redeemer.trends.summary.model';
import {
  ReportTrendErrorRedeem,
  ReportTrendErrorRedeemSchema,
} from '@fmc_reporting_statistic/model/error-redeemer-trends/report-trend-error-redeem.model';
import {
  ReportFactDetail,
  ReportFactDetailSchema,
} from '@fmc_reporting_statistic/model/fact-detail/report-fact-detail.model';
import {
  ReportKeywordTransaction,
  ReportKeywordTransactionSchema,
} from '@fmc_reporting_statistic/model/keyword-transaction/report-keyword-transaction.model';
import {
  LocationPrefix,
  LocationPrefixSchema,
} from '@fmc_reporting_statistic/model/location-prefix/location-prefix.mode';
import {
  ReportProgramHistory,
  ReportProgramHistorySchema,
} from '@fmc_reporting_statistic/model/program/unique.program.history.model';
import {
  ReportRedeemTransaction,
  ReportRedeemTransactionSchema,
} from '@fmc_reporting_statistic/model/redeem-transaction/redeem-transaction.model';
import {
  ReportMonitoring,
  ReportMonitoringSchema,
} from '@fmc_reporting_statistic/model/reporting.model';
import {
  ReportUniqueRewardLiveSystem,
  ReportUniqueRewardLiveSystemSchema,
} from '@fmc_reporting_statistic/model/reward/unique.reward.live.system.model';
import {
  ReportUniqueRewardTransaction,
  ReportUniqueRewardTransactionSchema,
} from '@fmc_reporting_statistic/model/reward/unique.reward.transaction.model';
import {
  TransactionMasterDetail,
  TransactionMasterDetailSchema,
} from '@fmc_reporting_statistic/model/trx-master-detail.model';
import {
  CouponGenerateUniqueMsisdn,
  CouponGenerateUniqueMsisdnSchema,
} from '@fmc_reporting_statistic/model/unique_msisdn/coupon.generate.unique.msisdn.daily.model';
import {
  MsisdnRedeemTransactionTemp,
  MsisdnRedeemTransactionTempSchema,
} from '@fmc_reporting_statistic/model/unique_msisdn/msisdn.redeem.transaction.temp';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNSchema,
} from '@fmc_reporting_statistic/model/unique_msisdn/unique.msisdn.daily.model';
import {
  MonthlyReportUniqueMSISDN,
  MonthlyReportUniqueMSISDNSchema,
} from '@fmc_reporting_statistic/model/unique_msisdn/unique.msisdn.monthly.model';
import {
  YearlyReportUniqueMSISDN,
  YearlyReportUniqueMSISDNSchema,
} from '@fmc_reporting_statistic/model/unique_msisdn/unique.msisdn.yearly.model';
import { ReportingStatisticService } from '@fmc_reporting_statistic/reporting_statistic.service';
import { ReportingTrendsChannelService } from '@fmc_reporting_statistic/services/channel_trends/reporting-channel-trends.service';
import { ReportingErrorRedeemerTrendsService } from '@fmc_reporting_statistic/services/error-redeemer-trends/error-redeemer-trends.service';
import { ReportTrendErrorRedeemService } from '@fmc_reporting_statistic/services/error-redeemer-trends/report-trend-error-redeem.service';
import { ReportingFactDetailService } from '@fmc_reporting_statistic/services/fact-detail/reporting-fact-detail.service';
import { GrossRevenueService } from '@fmc_reporting_statistic/services/gross-revenue/gross_revenue.service';
import { GrossRevenueTotalService } from '@fmc_reporting_statistic/services/gross-revenue/gross_revenue_total.service';
import { ReportKeywordWithStockService } from '@fmc_reporting_statistic/services/keyword_with_stocks/keyword_with_stocks.service';
import { AlertKeywordTobeExpiredService } from '@fmc_reporting_statistic/services/keyword-transaction/alert-keyword-tobe-expired.service';
import { ReportKeywordTransactionService } from '@fmc_reporting_statistic/services/keyword-transaction/report-keyword-transaction.service';
import { MerchantOutletCatalogueXMLService } from '@fmc_reporting_statistic/services/merchant-outlet/merchant-outlet-catalogue-xml.service';
import { ReportingPoinBurningService } from '@fmc_reporting_statistic/services/poin_burning/reporting-poin-burning.service';
import { ReportingPoinBurningMyTselService } from '@fmc_reporting_statistic/services/poin_burning_mytsel/reporting-poin-burning-mytsel.service';
import { PoinEarnService } from '@fmc_reporting_statistic/services/poin_earn/poin_earn.service';
import { PoinEarnRedeemerService } from '@fmc_reporting_statistic/services/poin_earn_redeemer/poin_earn_redeemer.service';
import { PoinOwnerService } from '@fmc_reporting_statistic/services/poin_owner/poin_owner.service';
import { ReportTransactionProgramService } from '@fmc_reporting_statistic/services/program/report.transaction.program.service';
import { ReportingProgramHistoryService } from '@fmc_reporting_statistic/services/program/reporting-program-history.service';
import { ReportingQuotaStockAlertService } from '@fmc_reporting_statistic/services/quota-stock-daily/reporting-quota-stock-alert.service';
import { ReportingQuotaStockDailyService } from '@fmc_reporting_statistic/services/quota-stock-daily/reporting-quota-stock-daily.service';
import { ReportRedeemTransactionService } from '@fmc_reporting_statistic/services/redeem-transaction/redeem-transaction.service';
import { ReportRedeemerMyTselService } from '@fmc_reporting_statistic/services/redeemer_mytsel/redeemer-mytsel.service';
import { ReportingNotificationService } from '@fmc_reporting_statistic/services/reporting_notification/reporting-notification.service';
import { GeneralReportingCoreService } from '@fmc_reporting_statistic/services/reporting-core/general-reporting-core.service';
import { RequestReportingCoreService } from '@fmc_reporting_statistic/services/reporting-core/request-reporting-core.service';
import { ReportingSftpService } from '@fmc_reporting_statistic/services/reporting-sftp/reporting-sftp.service';
import { ReportingRewardService } from '@fmc_reporting_statistic/services/reward/reporting-reward.service';
import { RewardCatalogXMLService } from '@fmc_reporting_statistic/services/reward-catalog/reward-catalog-xml.service';
import { ReportTransactionService } from '@fmc_reporting_statistic/services/transaction/reporting-transaction.service';
import { ReportTransactionBurningService } from '@fmc_reporting_statistic/services/transaction_burning/transaction-burning.service';
import { ReportTransactionBurningMyTselService } from '@fmc_reporting_statistic/services/transaction_burning_mytsel/transaction-burning-mytsel.service';
import { ReportingRedeemerExistingService } from '@fmc_reporting_statistic/services/unique-msisdn/redeemer-existing.service';
import { ReportingGenerateCouponUniqueMsisdnService } from '@fmc_reporting_statistic/services/unique-msisdn/reporting-generate-coupon-unique-msisdn.service';
import { ReportingUniqueMsisdnService } from '@fmc_reporting_statistic/services/unique-msisdn/reporting-unique-msisdn.service';
import { ReportingUniqueMsisdnMyTselService } from '@fmc_reporting_statistic/services/unique-msisdn/reporting-unique-msisdn-mytsel.service';
import { VoucherExpiredTriggerService } from '@fmc_reporting_statistic/services/voucher_expired/voucher_expired_trigger.service';
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
import { ScheduleModule } from '@nestjs/schedule';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import { SftpService } from '@sftp/sftp.service';
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
import { AuthorizationSchema } from '@/account/models/authorization.model';
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
import {
  CampaignBroadcastSchedule,
  CampaignBroadcastScheduleSchema,
} from '@/campaign/models/campaign.broadcast.schedule.model';
import {
  CampaignLog,
  CampaignLogSchema,
} from '@/campaign/models/campaign.log.model.v1';
import { Campaign, CampaignSchema } from '@/campaign/models/campaign.model';
import {
  CampaignRecipient,
  CampaignRecipientSchema,
} from '@/campaign/models/campaign.recipient.model';
import { CampaignProcessor } from '@/campaign/processor/campaign.processor';
import { CampaignServiceV1 } from '@/campaign/services/campaign.service.v1';
// import { TimeManagement } from '@/application/utils/Time/timezone';
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
import { Authorization } from '@/decorators/auth.decorator';
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
  MerchantV2,
  MerchantV2Schema,
} from '@/merchant/models/merchant.model.v2';
import {
  MerchantOutlet,
  MerchantOutletSchema,
} from '@/merchant/models/merchant.outlet.model';
import { Outlet, OutletSchema } from '@/merchant/models/outlet.model';
import { MerchantOutletService } from '@/merchant/services/merchant.outlet.service';
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
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  DeductPoint,
  DeductPointSchema,
} from '../../../apps/deduct/src/models/deduct.point.model';
import { AuctionService } from '../../auction/src/auction.service';
import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import {
  CronConfig,
  CronConfigSchema,
} from '../../cron/src/models/cron.config.model';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '../../prepaid-granular/models/prepaid_granular_log';
import { UtilsService } from '../../utils/services/utils.service';
// import { ReportingServiceResult } from './model/reporting_service_result';
import { ReportingGenerationController } from './reporting_generation.controller';
import { ReportingGenerationService } from './reporting_generation.service';
import { PointEarningService } from '@/transaction/services/point/point.erning.service';
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
    /*
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
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: ReportMonitoring.name, schema: ReportMonitoringSchema },
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
        name: Keyword.name,
        schema: KeywordSchema,
      },
      {
        name: KeywordApprovalLog.name,
        schema: KeywordApprovalLogSchema,
      },
      {
        name: ReportUniqueChannelTrendsSystem.name,
        schema: ReportUniqueChannelTrendsSystemSchema,
      },
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Location.name, schema: LocationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
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
      { name: Channel.name, schema: ChannelSchema },
      { name: ReportProgramHistory.name, schema: ReportProgramHistorySchema },
      { name: ReportFactDetail.name, schema: ReportFactDetailSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Location.name, schema: LocationSchema },
      { name: PIC.name, schema: PICSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: Redeem.name, schema: RedeemSchema },
      {
        name: CouponGenerateUniqueMsisdn.name,
        schema: CouponGenerateUniqueMsisdnSchema,
      },
      {
        name: MsisdnRedeemTransactionTemp.name,
        schema: MsisdnRedeemTransactionTempSchema,
      },
      { name: Stock.name, schema: StockSchema },
      {
        name: ReportRedeemTransaction.name,
        schema: ReportRedeemTransactionSchema,
      },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      {
        name: ReportTrendErrorRedeem.name,
        schema: ReportTrendErrorRedeemSchema,
      },
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: MerchantOutlet.name, schema: MerchantOutletSchema },
      { name: Outlet.name, schema: OutletSchema },

      { name: Authorization.name, schema: AuthorizationSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    */
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
      { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
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
      { name: MerchantOutlet.name, schema: MerchantOutletSchema },
      { name: Outlet.name, schema: OutletSchema },

      { name: Location.name, schema: LocationSchema },
      { name: PIC.name, schema: PICSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
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

      {
        name: TransactionMasterDetail.name,
        schema: TransactionMasterDetailSchema,
      },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: Account.name, schema: AccountSchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },
      {
        name: TransactionMaster.name,
        schema: TransactionMasterSchema,
      },

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

      {
        name: VerificationVoucher.name,
        schema: VerificationVoucherSchema,
      },
      {
        name: VoucherBatch.name,
        schema: VoucherBatchSchema,
      },
      {
        name: VoucherImport.name,
        schema: VoucherImportSchema,
      },
      { name: VoucherTask.name, schema: VoucherTaskSchema },
      { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      {
        name: CampaignBroadcastSchedule.name,
        schema: CampaignBroadcastScheduleSchema,
      },
      { name: CampaignLog.name, schema: CampaignLogSchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      {
        name: AccountCredentialLog.name,
        schema: AccountCredentialLogSchema,
      },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: RefundPoint.name, schema: RefundPointSchema },
      { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },
      { name: APILog.name, schema: APILogSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: Bank.name, schema: BankSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: SftpConfig.name, schema: SftpConfigSchema },
      { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: Donation.name, schema: DonationSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },
      { name: InjectWhitelist.name, schema: InjectWhitelistSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: StockSummary.name, schema: StockSummarySchema },
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
        { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
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
        {
          name: TransactionMasterDetail.name,
          schema: TransactionMasterDetailSchema,
        },
        {
          name: TransactionMaster.name,
          schema: TransactionMasterSchema,
        },
      ],
      'reporting',
    ),
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
        {
          name: TransactionMasterDetail.name,
          schema: TransactionMasterDetailSchema,
        },
        {
          name: TransactionMaster.name,
          schema: TransactionMasterSchema,
        },
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
        { name: MerchantOutlet.name, schema: MerchantOutletSchema },
        { name: Outlet.name, schema: OutletSchema },

        { name: Location.name, schema: LocationSchema },
        { name: PIC.name, schema: PICSchema },
        { name: LocationBucket.name, schema: LocationBucketSchema },
        { name: CustomerTier.name, schema: CustomerTierSchema },
        { name: CustomerBadge.name, schema: CustomerBadgeSchema },
        { name: CustomerBrand.name, schema: CustomerBrandSchema },
        { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
        { name: Redeem.name, schema: RedeemSchema },
        { name: Vote.name, schema: VoteSchema },
        { name: VoteOption.name, schema: VoteOptionSchema },
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

        {
          name: TransactionMasterDetail.name,
          schema: TransactionMasterDetailSchema,
        },
        { name: Authorization.name, schema: AuthorizationSchema },
        { name: StockLogs.name, schema: StockLogSchema },
        { name: StockReserve.name, schema: StockReserveSchema },
        { name: Account.name, schema: AccountSchema },
        { name: StockThreshold.name, schema: StockThresholdSchema },
        {
          name: TransactionMaster.name,
          schema: TransactionMasterSchema,
        },

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

        {
          name: VerificationVoucher.name,
          schema: VerificationVoucherSchema,
        },
        {
          name: VoucherBatch.name,
          schema: VoucherBatchSchema,
        },
        {
          name: VoucherImport.name,
          schema: VoucherImportSchema,
        },
        { name: VoucherTask.name, schema: VoucherTaskSchema },
        { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
        { name: Campaign.name, schema: CampaignSchema },
        { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
        {
          name: CampaignBroadcastSchedule.name,
          schema: CampaignBroadcastScheduleSchema,
        },
        { name: CampaignLog.name, schema: CampaignLogSchema },
        { name: KeywordNotification.name, schema: KeywordNotificationSchema },
        { name: Role.name, schema: RoleSchema },
        { name: AccountLocation.name, schema: AccountLocationSchema },
        {
          name: AccountCredentialLog.name,
          schema: AccountCredentialLogSchema,
        },
        { name: InjectPoint.name, schema: InjectPointSchema },
        { name: RefundPoint.name, schema: RefundPointSchema },
        { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },
        { name: APILog.name, schema: APILogSchema },
        { name: KeywordType.name, schema: KeywordTypeSchema },
        { name: Bank.name, schema: BankSchema },
        { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
        { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
        { name: ProgramNotification.name, schema: ProgramNotificationSchema },
        { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
        { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
        { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
        { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
        { name: Merchant.name, schema: MerchantSchema },
        { name: SftpConfig.name, schema: SftpConfigSchema },
        { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
        { name: CheckRedeem.name, schema: CheckRedeemSchema },
        { name: TransactionVote.name, schema: TransactionVoteSchema },
        { name: Donation.name, schema: DonationSchema },
        { name: TransactionDonation.name, schema: TransactionDonationSchema },
        { name: DonationProcess.name, schema: DonationProcessSchema },
        { name: InjectWhitelist.name, schema: InjectWhitelistSchema },
        { name: InjectCoupon.name, schema: InjectCouponSchema },
        { name: AuctionBidder.name, schema: AuctionBidderSchema },
        { name: StockSummary.name, schema: StockSummarySchema },
      ],
      'secondary',
    ),
    HttpModule,
    ClientsModule.registerAsync([
      KafkaConn.reporting_generation[0],
      KafkaConn.reporting_generation_recovery[0],
      KafkaConn.notification[0],
      KafkaConn.notification_general[0],
      KafkaConn.sftp[0],
      KafkaConn.voucher[0],
      KafkaConn.campaign[0],
      KafkaConn.transaction_master[0],
      KafkaConn.deduct[0],
      KafkaConn.inject_point[0],
      KafkaConn.refund[0],
      KafkaConn.data_store[0],

      KafkaConnProducer.reporting_generation[0],
      KafkaConnProducer.reporting_generation_recovery[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.campaign[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.data_store[0],
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
          transports: WinstonCustomTransport[targetEnv].reporting_generation,
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
    BullModule.registerQueueAsync(RedisCampaign),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisSftp),
    ScheduleModule.forRoot(),
  ],
  controllers: [ReportingGenerationController],
  providers: [
    CustomerService,
    ReportingGenerationService,
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
    ReportTransactionBurningService,
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
    MerchantOutletService,
    MerchantOutletCatalogueXMLService,
    ExceptionHandler,
    StockService,
    ReportingUniqueMsisdnMyTselService,
    NotificationService,
    SlRedisService,
    VoucherService,
    VoucherUpdateService,
    CampaignServiceV1,
    CampaignProcessor,
    AccountService,
    PointService,
    MerchantService,
    KeywordService,
    ProgramServiceV2,
    TransactionMasterService,
    EligibilityService,
    SftpService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    DonationService,
    EsbProfileService,
    WhitelistService,
    PointFmcService,
    EsbProfileIntegration,
    MainCrmbService,
    MainCrmbIntegration,
    AuctionService,
    PointEarningService
  ],
})
export class ReportingGenerationModule {}
