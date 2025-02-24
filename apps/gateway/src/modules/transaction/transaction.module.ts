import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
  RedisSftp,
  RedisTrxRecovery,
} from '@configs/redis/redis.module';
import { MerchantService } from '@deduct/services/merchant.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '@prepaid_granular/models/prepaid_granular_log';
import {
  CustomerMostRedeem,
  CustomerMostRedeemSchema,
} from '@reporting_statistic/model/reward-catalog/customer-most-redeem.model';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
import {
  TransactionStepModel,
  TransactionStepSchema,
} from '@transaction_master/models/transaction_step.model';
import { TransactionRecoveryService } from '@transaction_master/transaction_recovery.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
import * as redisStore from 'cache-manager-ioredis';
import { SoapModule, SoapModuleOptions } from 'nestjs-soap';

// import { SoapModule, SoapModuleOptions } from 'nestjs-soap';
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
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  BatchProcessLog,
  BatchProcessLogSchema,
} from '@/application/models/batch.log.model';
import { BatchProcessRowLog } from '@/application/models/batch-row.log.model';
import {
  BatchScheduler,
  BatchSchedulerSchema,
} from '@/application/models/batch-scheduler.model';
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
import { Bank, BankSchema } from '@/bank/models/bank.model';
// Channel
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { CrmbModule } from '@/crmb/crmb.module';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@/cron/sftp/model/sftp.outgoing.log';
import { CustomerModule } from '@/customer/customer.module';
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
// import { KeywordModule } from '@/keyword/keyword.module';
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
import { LocationModule } from '@/location/location.module';
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LocationService } from '@/location/services/location.service';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  LuckyDrawUploadDetailModel,
  LuckyDrawUploadDetailSchema,
} from '@/lucky-draw/models/lucky.draw.upload.detail.model';
import {
  LuckyDrawUploadModel,
  LuckyDrawUploadSchema,
} from '@/lucky-draw/models/lucky.draw.upload.model';
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
import { MerchantV2Service } from '@/merchant/services/merchant.service.v2';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
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
import { ProgramModule } from '@/program/program.module';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { Stock, StockSchema } from '@/stock/models/stock.model';
import {
  StockSummary,
  StockSummarySchema,
} from '@/stock/models/stocks-summary.model';
import { StockModule } from '@/stock/stock.module';
import { CouponController } from '@/transaction/controllers//coupon/coupon.controller';
import { CouponFmcController } from '@/transaction/controllers//coupon/coupon.fmc.controller';
import { BatchSchedulerController } from '@/transaction/controllers/batch/batch-scheduler.controller';
import { CallbackController } from '@/transaction/controllers/callback/callback.controller';
import { EauctionController } from '@/transaction/controllers/eauction/eauction.controller';
import { KeywordController } from '@/transaction/controllers/keyword/keyword.controller';
// Controller
import { PointController } from '@/transaction/controllers/point/point.controller';
import { RedeemController } from '@/transaction/controllers/redeem/redeem.controller';
import { TransactionController } from '@/transaction/controllers/transaction.controller';
import { VoucherController } from '@/transaction/controllers/voucher/voucher.controller';
import { VoucherFmcController } from '@/transaction/controllers/voucher/voucher.fmc.controller';
import { WhitelistController } from '@/transaction/controllers/whitelist/whitelist.controller';
import {
  CallbackPostpaid,
  PostpaidCallbackSchema,
} from '@/transaction/models/callback/postpaid.callback.model';
import {
  CallbackPrepaid,
  PrepaidCallbackSchema,
} from '@/transaction/models/callback/prepaid.callback.model';
import {
  DonationProcess,
  DonationProcessSchema,
} from '@/transaction/models/donation/donation.logger.model';
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
  VerificationVoucher,
  VerificationVoucherSchema,
} from '@/transaction/models/voucher/verification.voucher.model';
import {
  InjectWhitelist,
  InjectWhitelistSchema,
} from '@/transaction/models/whitelist/inject.whitelist.model';
import { TransactionRecoveryProcessor } from '@/transaction/processor/transaction.recovery.processor';
import { CouponFmcService } from '@/transaction/services/coupon/coupon.fmc.service';
import { CouponService } from '@/transaction/services/coupon/coupon.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { TransKeywordService } from '@/transaction/services/keyword/keyword.service';
import { PointService } from '@/transaction/services/point/point.service';
import { TransactionService } from '@/transaction/services/transaction.service';
import { VoucherFmcService } from '@/transaction/services/voucher/voucher.fmc.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';
import { Vote, VoteSchema } from '@/vote/models/vote.model';
import { VoteOption, VoteOptionSchema } from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from '@/vote/models/vote_transaction.model';
import { VoteService } from '@/vote/services/vote.service';
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import { AuctionService } from '../../../../auction/src/auction.service';
import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../../../auction/src/models/auction_bidder.model';
import {
  SftpConfig,
  SftpConfigSchema,
} from '../../../../sftp/src/models/sftp.config.model';
import { SftpService } from '../../../../sftp/src/sftp.service';
import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { MainCrmbIntegration } from '../crmb/integration/main.crmb.integration';
import { MainCrmbService } from '../crmb/services/main.crmb.service';
import { TransactionHttpservice } from './config/transaction-http.service';
import { TransactionOptionalService } from './config/transaction-optional.service';
import { BidController } from './controllers/bid/bid.controller';
import { DonationController } from './controllers/donation/donation.controller';
import { PointFmcController } from './controllers/point/point.fmc.controller';
import { TransactionProgramController } from './controllers/program/program.controller';
import { RedeemFmcController } from './controllers/redeem/redeem.fmc.controller';
import { RewardCatalogueController } from './controllers/reward-catalogue/reward-catalogue.controller';
import { VoucherUploadController } from './controllers/voucher/voucher.upload.controller';
import { Bid, BidSchema } from './models/bid/bid.model';
import {
  CallbackAuth,
  CallbackAuthSchema,
} from './models/callback/callback.auth.model';
import {
  CallbackTransaction,
  CallbackTransactionSchema,
} from './models/callback/callback.transaction.model';
import { Donation, DonationSchema } from './models/donation/donation.model';
import {
  TransactionDonation,
  TransactionDonationSchema,
} from './models/donation/transaction_donation.model';
import {
  InjectCouponSummary,
  InjectCouponSummarySchema,
} from './models/inject-coupon-summary.model';
import {
  ProgramWinner,
  ProgramWinnerSchema,
} from './models/program/program.winner.model';
import {
  MaxRedeemThresholds,
  MaxRedeemThresholdsSchema,
} from './models/redeem/max_redeem.treshold.model';
import { Redeem, RedeemSchema } from './models/redeem/redeem.model';
import {
  VoucherBatch,
  VoucherBatchSchema,
} from './models/voucher/voucher.batch.model';
import {
  VoucherImport,
  VoucherImportSchema,
} from './models/voucher/voucher.import.model';
import {
  VoucherTask,
  VoucherTaskSchema,
} from './models/voucher/voucher.task.model';
import {
  VoucherUpdate,
  VoucherUpdateSchema,
} from './models/voucher/voucher.update.model';
import { BatchSchedulerService } from './services/batch/batch-scheduler.service';
import { BidService } from './services/bid/bid.service';
import { CallbackService } from './services/callback/callback.service';
import { Coupon2Service } from './services/coupon/coupon2.service';
import { DonationService } from './services/donation/donation.service';
import { EauctionService } from './services/eauction/eauction.service';
import { PointDeductService } from './services/point/point.deduct.service';
import { PointFmcService } from './services/point/point.fmc.service';
import { ProgramService } from './services/program/program.service';
import { BatchRedeemService } from './services/redeem/batch_redeem.service';
import { MaxRedeemTresholdsService } from './services/redeem/max_redeem.tresholds.service';
import { RedeemFmcService } from './services/redeem/redeem.fmc.service';
import { RedeemService } from './services/redeem/redeem.service';
import { RewardCatalogueService } from './services/reward-catalogue/reward-catalogue.service';
import { TransactionMasterService } from './services/transaction_master/transaction_master.service';
import { VerificationVoucherService } from './services/voucher/verification.voucher.services';
import { VoucherUpdateService } from './services/voucher/voucher.update.service';
import { VoucherUploadService } from './services/voucher/voucher.upload.service';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      KafkaConn.batch[0],
      KafkaConn.refund[0],
      KafkaConn.deduct[0],
      KafkaConn.inject_point[0],
      KafkaConn.donation[0],
      KafkaConn.eligibility[0],
      KafkaConn.voucher[0],
      KafkaConn.transaction_master[0],
      KafkaConn.coupon[0],
      KafkaConn.coupon_high[0],
      KafkaConn.coupon_low[0],
      KafkaConn.void[0],
      KafkaConn.notification[0],
      KafkaConn.redeem[0],
      KafkaConn.redeem_high[0],
      KafkaConn.redeem_low[0],
      KafkaConn.notification_general[0],
      KafkaConn.sftp[0],
      KafkaConn.reporting_generation[0],
      KafkaConn.reporting_statistic[0],
      KafkaConn.callback[0],
      KafkaConn.redeem_fmc[0],
      KafkaConn.multi_bonus[0],

      KafkaConnProducer.batch[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.donation[0],
      KafkaConnProducer.eligibility[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.coupon_high[0],
      KafkaConnProducer.coupon_low[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.redeem[0],
      KafkaConnProducer.redeem_high[0],
      KafkaConnProducer.redeem_low[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.reporting_generation[0],
      KafkaConnProducer.reporting_statistic[0],
      KafkaConnProducer.redeem_fmc[0],
      KafkaConnProducer.callback[0],
      KafkaConnProducer.multi_bonus[0],
    ]),
    SlconfigModule,
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisTrxRecovery),
    BullModule.registerQueueAsync(RedisDataMaster),
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Bank.name, schema: BankSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: ExternalBonusLog.name, schema: ExternalBonusLogSchema },

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
      { name: InjectCouponSummary.name, schema: InjectCouponSummarySchema },
      {
        name: LuckyDrawUploadModel.name,
        schema: LuckyDrawUploadSchema,
      },
      {
        name: LuckyDrawUploadDetailModel.name,
        schema: LuckyDrawUploadDetailSchema,
      },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: RefundPoint.name, schema: RefundPointSchema },
      { name: ProgramWinner.name, schema: ProgramWinnerSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: RedeemModel.name, schema: RedeemModelSchema },
      { name: CallbackAuth.name, schema: CallbackAuthSchema },
      { name: CallbackTransaction.name, schema: CallbackTransactionSchema },
      { name: CallbackPrepaid.name, schema: PrepaidCallbackSchema },
      { name: CallbackPostpaid.name, schema: PostpaidCallbackSchema },
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
      { name: BatchProcessRowLog.name, schema: BatchProcessLogSchema },
      { name: Donation.name, schema: DonationSchema },

      { name: Merchant.name, schema: MerchantSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },

      { name: Voucher.name, schema: VoucherSchema },
      { name: VoucherImport.name, schema: VoucherImportSchema },
      { name: VoucherBatch.name, schema: VoucherBatchSchema },
      { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
      { name: VoucherTask.name, schema: VoucherTaskSchema },
      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: MerchantOutlet.name, schema: MerchantOutletSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
      { name: OTP.name, schema: OTPSchema },
      { name: Bid.name, schema: BidSchema },
      { name: TransactionMaster.name, schema: TransactionMasterSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
      { name: SftpConfig.name, schema: SftpConfigSchema },

      { name: Stock.name, schema: StockSchema },

      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: Outlet.name, schema: OutletSchema },

      { name: TransactionStepModel.name, schema: TransactionStepSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },

      { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },

      { name: BatchScheduler.name, schema: BatchSchedulerSchema },

      { name: Stock.name, schema: StockSchema },

      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: CustomerMostRedeem.name, schema: CustomerMostRedeemSchema },
      { name: StockSummary.name, schema: StockSummarySchema },

      { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
    ]),
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
        { name: SystemConfig.name, schema: SystemConfigSchema },
        { name: AuctionBidder.name, schema: AuctionBidderSchema },
        { name: APILog.name, schema: APILogSchema },
        { name: Account.name, schema: AccountSchema },
        { name: AccountLocation.name, schema: AccountLocationSchema },
        { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
        { name: Bank.name, schema: BankSchema },
        { name: Role.name, schema: RoleSchema },
        { name: Channel.name, schema: ChannelSchema },
        { name: Authorization.name, schema: AuthorizationSchema },

        { name: ExternalBonusLog.name, schema: ExternalBonusLogSchema },

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
        { name: InjectCouponSummary.name, schema: InjectCouponSummarySchema },
        {
          name: LuckyDrawUploadModel.name,
          schema: LuckyDrawUploadSchema,
        },
        {
          name: LuckyDrawUploadDetailModel.name,
          schema: LuckyDrawUploadDetailSchema,
        },
        { name: InjectPoint.name, schema: InjectPointSchema },
        { name: DeductPoint.name, schema: DeductPointSchema },
        { name: RefundPoint.name, schema: RefundPointSchema },
        { name: ProgramWinner.name, schema: ProgramWinnerSchema },
        { name: Redeem.name, schema: RedeemSchema },
        { name: RedeemModel.name, schema: RedeemModelSchema },
        { name: CallbackAuth.name, schema: CallbackAuthSchema },
        { name: CallbackTransaction.name, schema: CallbackTransactionSchema },
        { name: CallbackPrepaid.name, schema: PrepaidCallbackSchema },
        { name: CallbackPostpaid.name, schema: PostpaidCallbackSchema },
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
        { name: BatchProcessRowLog.name, schema: BatchProcessLogSchema },
        { name: Donation.name, schema: DonationSchema },

        { name: Merchant.name, schema: MerchantSchema },
        { name: TransactionDonation.name, schema: TransactionDonationSchema },
        { name: DonationProcess.name, schema: DonationProcessSchema },

        { name: Voucher.name, schema: VoucherSchema },
        { name: VoucherImport.name, schema: VoucherImportSchema },
        { name: VoucherBatch.name, schema: VoucherBatchSchema },
        { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
        { name: VoucherTask.name, schema: VoucherTaskSchema },
        { name: MerchantV2.name, schema: MerchantV2Schema },
        { name: MerchantOutlet.name, schema: MerchantOutletSchema },
        { name: CheckRedeem.name, schema: CheckRedeemSchema },
        { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
        { name: OTP.name, schema: OTPSchema },
        { name: Bid.name, schema: BidSchema },
        { name: TransactionMaster.name, schema: TransactionMasterSchema },
        { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
        { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
        { name: SftpConfig.name, schema: SftpConfigSchema },
        { name: Outlet.name, schema: OutletSchema },

        { name: TransactionStepModel.name, schema: TransactionStepSchema },

        { name: KeywordPriority.name, schema: KeywordPrioritySchema },

        { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },

        { name: BatchScheduler.name, schema: BatchSchedulerSchema },
      ],
      'secondary',
    ),
    // SoapModule.forRootAsync({
    //   clientName: 'SOAP_CLIENT',
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (
    //     configService: ConfigService,
    //   ): Promise<SoapModuleOptions> => {
    //     return {
    //       uri: configService.get<string>('dsp.url'),
    //       clientName: 'SOAP_CLIENT',
    //       clientOptions: {
    //         wsdl_options: {
    //           timeout: configService.get<number>('dsp.timeout'),
    //         },
    //       },
    //     };
    //   },
    // }),
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
          transports: WinstonCustomTransport[targetEnv].gateway,
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
    LoggingModule,
    AccountModule,
    HttpModule,
    ProgramModule,
    CustomerModule,
    LovModule,
    LocationModule,
    StockModule,
    EsbModule,
    CrmbModule,
  ],
  controllers: [
    TransactionController,
    TransactionProgramController,
    PointController,
    WhitelistController,
    KeywordController,
    RedeemController,
    CouponController,
    CouponFmcController,
    CallbackController,
    EauctionController,
    RewardCatalogueController,
    VoucherController,
    VoucherUploadController,
    DonationController,
    BidController,
    BatchSchedulerController,
    PointFmcController,
    RedeemFmcController,
    VoucherFmcController,
  ],
  providers: [
    SlconfigService,
    ConfigService,
    KeywordService,
    LoggingInterceptor,
    EauctionService,
    AccountService,
    ChannelService,
    CouponService,
    CouponFmcService,
    PointService,
    ProgramService,
    RedeemService,
    CallbackService,
    WhitelistService,
    RewardCatalogueService,
    TransactionHttpservice,
    TransactionService,
    ApplicationService,
    EligibilityService,
    ProgramServiceV2,
    CustomerService,
    LovService,
    TransactionOptionalService,
    LocationService,
    DonationService,
    VoucherService,
    VoucherUploadService,
    Coupon2Service,
    VerificationVoucherService,
    TransKeywordService,
    OTPService,
    BidService,
    NotificationContentService,
    SftpService,
    VoteService,
    MerchantV2Service,
    TransactionMasterService,
    CallApiConfigService,
    TransactionRecoveryService,
    TransactionRecoveryProcessor,
    ExceptionHandler,
    UtilsService,
    PointFmcService,
    BatchRedeemService,
    SlRedisService,
    MaxRedeemTresholdsService,
    BatchSchedulerService,
    RedeemFmcService,
    VoucherFmcService,
    MainCrmbIntegration,
    MainCrmbService,
    VoucherUpdateService,
    EsbProfileService,
    EsbProfileIntegration,
    VoteService,
    PointDeductService,
    AuctionService,
    MerchantService,
  ],
  exports: [
    PointService,
    TransactionOptionalService,
    VoucherService,
    VoucherFmcService,
    CouponService,
    CouponFmcService,
    Coupon2Service,
    WhitelistService,
    RedeemService,
    TransactionMasterService,
    BatchSchedulerService,
    PointDeductService,
    TransKeywordService,
  ],
})
export class TransactionModule {}
