import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '@prepaid_granular/models/prepaid_granular_log';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
import { ExceptionHandler } from '@utils/logger/handler';

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
import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import {
  BatchProcessLog,
  BatchProcessLogSchema,
} from '@/application/models/batch.log.model';
import {
  NotificationLog,
  NotificationLogSchema,
} from '@/application/models/notification.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
// import { SftpbatchRedeemerCronService } from './sftp_batch_redeemer/services/sftp.batch.redeemer.cron.service';
// import { SftpbatchRedeemerJobService } from './sftp_batch_redeemer/services/sftp.batch.redeemer.job.service';
// import { SftpbatchRedeemerNbpCronService } from './sftp_batch_redeemer_nbp/services/sftp.batch.redeemer.nbp.cron.service';
// import { SftpbatchRedeemerNbpJobService } from './sftp_batch_redeemer_nbp/services/sftp.batch.redeemer.nbp.job.service';
// import { ReportQuotaStockDailyCronService } from './report-quota-stock-daily/services/report-quota-stock-daily.cron.service';
// import { ReportQuotaStockDailyJobService } from './report-quota-stock-daily/services/report-quota-stock-daily.job.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { SendNotificationService } from '@/application/services/send-notification.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { ExampleJobSetup } from '@/cron/sftp/services/example.job.setup';
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
import { EsbInboxIntegration } from '@/esb/integration/esb.inbox.integration';
import { EsbNotificationIntegration } from '@/esb/integration/esb.notification.integration';
import { EsbProfileIntegration } from '@/esb/integration/esb.profile.integration';
import { EsbInboxService } from '@/esb/services/esb.inbox.service';
import { EsbNotificationService } from '@/esb/services/esb.notification.service';
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
/**
 * Dependencies notification
 */
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
import { OTP, OTPSchema } from '@/otp/models/otp.model';
import { OTPService } from '@/otp/services/otp.service';
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
import { ReportModule } from '@/report/report.module';
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
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';
import {
  Voucher,
  VoucherSchema,
} from '@/transaction/models/voucher/voucher.model';
import {
  InjectWhitelist,
  InjectWhitelistSchema,
} from '@/transaction/models/whitelist/inject.whitelist.model';
import { DonationService } from '@/transaction/services/donation/donation.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { PointService } from '@/transaction/services/point/point.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';
import { TransactionMasterService } from '@/transaction/services/transaction_master/transaction_master.service';
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
} from '../../../../auction/src/models/auction_bidder.model';
import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import {
  LocationBucket,
  LocationBucketSchema,
} from '../location/models/location.bucket.model';
import { PIC, PICSchema } from '../pic/models/pic.model';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
// import { KeywordExpiredAlertGeneralJobService } from './keyword_expired_alert/services/keyword.expired.alert.general.job.service';
// import { KeywordExpiredAlertGeneralService } from './keyword_expired_alert/services/keyword.expired.alert.general.service';
// import { KeywordExpiredAlertSpecificJobService } from './keyword_expired_alert/services/keyword.expired.alert.specific.job.service';
// import { KeywordExpiredAlertSpecificService } from './keyword_expired_alert/services/keyword.expired.alert.specific.service';
// import { KeywordQuotaAlertJobService } from './keyword_quota_alert/services/keyword.quota.alert.job.service';
// import { KeywordQuotaAlertService } from './keyword_quota_alert/services/keyword.quota.alert.service';
// import { ReportWithStockCronService } from './report-with-stock/services/report-with-stock.cron.service';
// import { ReportWithStockJobService } from './report-with-stock/services/report-with-stock.job.service';
// import { SampleCronService } from './sample/services/sample.cron.service';
// import { SampleJobService } from './sample/services/sample.job.service';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from './sftp/model/sftp.outgoing.log';

@Module({
  imports: [
    ClientsModule.registerAsync([
      KafkaConn.deduct[0],
      KafkaConn.void[0],
      KafkaConn.transaction_master[0],
      KafkaConn.coupon[0],
      KafkaConn.eligibility[0],
      KafkaConn.inject_point[0],
      KafkaConn.notification[0],
      KafkaConn.redeem[0],
      KafkaConn.redeem_high[0],
      KafkaConn.redeem_low[0],
      KafkaConn.notification_general[0],
      KafkaConn.refund[0],
      KafkaConn.redeem_fmc[0],

      KafkaConnProducer.deduct[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.eligibility[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.redeem[0],
      KafkaConnProducer.redeem_high[0],
      KafkaConnProducer.redeem_low[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.redeem_fmc[0],
    ]),
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisDataMaster),
    HttpModule,
    MongooseModule.forFeature([
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: Location.name, schema: LocationSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
      { name: PIC.name, schema: PICSchema },
      { name: InjectWhitelist.name, schema: InjectWhitelistSchema },

      /**
       * Notification depedenci Model
       */
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: Bank.name, schema: BankSchema },

      { name: Stock.name, schema: StockSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: BatchProcessLog.name, schema: BatchProcessLogSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: CustomerPoinHistory.name, schema: CustomerPoinHistorySchema },

      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },

      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: InjectPoint.name, schema: InjectPointSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: RefundPoint.name, schema: RefundPointSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: TransactionMaster.name, schema: TransactionMasterSchema },

      { name: Donation.name, schema: DonationSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },

      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: OTP.name, schema: OTPSchema },

      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },
      { name: Voucher.name, schema: VoucherSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: StockSummary.name, schema: StockSummarySchema },

      { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
    ]),
    ScheduleModule.forRoot(),
    ReportModule,
    KeywordModule,
    EsbModule,
  ],
  controllers: [CronController],
  providers: [
    AccountService,
    ChannelService,
    CronService,
    // SampleJobService,
    // SampleCronService,
    // KeywordExpiredAlertGeneralService,
    // KeywordExpiredAlertGeneralJobService,
    // KeywordExpiredAlertSpecificService,
    // KeywordExpiredAlertSpecificJobService,
    SendNotificationService,
    // KeywordQuotaAlertService,
    // KeywordQuotaAlertJobService,
    // SftpbatchRedeemerCronService,
    // SftpbatchRedeemerJobService,
    RedeemService,
    // SftpbatchRedeemerNbpCronService,
    // SftpbatchRedeemerNbpJobService,
    // ReportWithStockCronService,
    // ReportWithStockJobService,
    // ReportQuotaStockDailyCronService,
    // ReportQuotaStockDailyJobService,
    CustomerService,

    ExampleJobSetup,
    ProgramServiceV2,
    /**
     * Notification depedenci Service
     */
    SendNotificationService,
    SmsIntegrationService,
    EsbNotificationService,
    EsbInboxService,
    LovService,
    ApplicationService,
    NotificationService,
    EsbNotificationIntegration,
    EsbInboxIntegration,
    StockService,
    PointService,
    PointFmcService,
    DonationService,
    TransactionOptionalService,
    MainCrmbService,
    MainCrmbIntegration,

    OTPService,
    NotificationContentService,
    VoteService,
    TransactionMasterService,
    EligibilityService,
    CallApiConfigService,
    LocationService,
    WhitelistService,
    ExceptionHandler,
    SlconfigService,
    SlRedisService,
    EsbProfileService,
    EsbProfileIntegration,
  ],
  exports: [],
})
export class CronModule {}
