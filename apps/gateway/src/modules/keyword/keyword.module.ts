import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisKeyword,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
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
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@/cron/sftp/model/sftp.outgoing.log';
import {
  CustomerBadge,
  CustomerBadgeSchema,
} from '@/customer/models/customer.badge.model';
import { Customer, CustomerSchema } from '@/customer/models/customer.model';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { KeywordController } from '@/keyword/controllers/keyword.controller';
import {
  KeywordEligibility,
  KeywordEligibilitySchema,
} from '@/keyword/models/keyword.eligibility.model';
import {
  KeywordEmployeeNumber,
  KeywordEmployeeNumberSchema,
} from '@/keyword/models/keyword.employee.number.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordShift,
  KeywordShiftSchema,
} from '@/keyword/models/keyword.shift.model';
import { KeywordProcessor } from '@/keyword/processors/keyword.processor';
import { KeywordService } from '@/keyword/services/keyword.service';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';
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
  Donation,
  DonationSchema,
} from '@/transaction/models/donation/donation.model';
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
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  SftpConfig,
  SftpConfigSchema,
} from '../../../../sftp/src/models/sftp.config.model';
import { SftpService } from '../../../../sftp/src/sftp.service';
import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from './models/keyword.approval.log';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from './models/keyword.priority.model';
import { KeywordType, KeywordTypeSchema } from './models/keyword.type';

const listModel = [
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Account.name, schema: AccountSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Role.name, schema: RoleSchema },
  { name: Channel.name, schema: ChannelSchema },
  { name: APILog.name, schema: APILogSchema },
  { name: Bank.name, schema: BankSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordEmployeeNumber.name, schema: KeywordEmployeeNumberSchema },
  { name: KeywordShift.name, schema: KeywordShiftSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  {
    name: KeywordApprovalLog.name,
    schema: KeywordApprovalLogSchema,
  },
  { name: Location.name, schema: LocationSchema },
  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: Donation.name, schema: DonationSchema },
  { name: Voucher.name, schema: VoucherSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: Lov.name, schema: LovSchema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: Authorization.name, schema: AuthorizationSchema },

  { name: SftpConfig.name, schema: SftpConfigSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },

  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: StockThreshold.name, schema: StockThresholdSchema },

  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: StockSummary.name, schema: StockSummarySchema },
];
@Module({
  imports: [
    LoggingModule,
    HttpModule,
    MongooseModule.forFeature(listModel),
    MongooseModule.forFeature(listModel, 'secondary'),
    BullModule.registerQueueAsync(RedisKeyword),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisDataMaster),
    ClientsModule.registerAsync([
      KafkaConn.voucher[0],
      KafkaConn.notification_general[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.voucher[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.sftp[0],
    ]),
    SlconfigModule,
  ],
  providers: [
    ApplicationService,
    KeywordService,
    LoggingInterceptor,
    AccountService,
    ChannelService,
    KeywordProcessor,
    NotificationService,
    StockService,
    VoucherService,
    TransactionOptionalService,
    LovService,
    SftpService,
    VoteService,
    ProgramServiceV2,
    ExceptionHandler,
    SlRedisService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoucherUpdateService,
    VoteService,
  ],
  controllers: [KeywordController],
  exports: [
    NotificationService,
    KeywordService,
    StockService,
    VoucherService,
    MaxRedeemTresholdsService,
  ],
})
export class KeywordModule {
  //
}
