import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import {
  RedisDataMaster,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { Channel } from 'diagnostics_channel';
import { Kafka } from 'kafkajs';

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
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { ChannelSchema } from '@/channel/models/channel.model';
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
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
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
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import {
  KeywordShift,
  KeywordShiftSchema,
} from '@/keyword/models/keyword.shift.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
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
import { ProgramServiceV3 } from '@/program/services/program.service.v3';
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
import { StockModule } from '@/stock/stock.module';
import { TelegramController } from '@/telegram/controllers/telegram.controller';
import { TelegramService } from '@/telegram/services/telegram.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
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

const listModel = [
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Authorization.name, schema: AuthorizationSchema },

  { name: APILog.name, schema: APILogSchema },
  { name: Account.name, schema: AccountSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Role.name, schema: RoleSchema },
  { name: Channel.name, schema: ChannelSchema },

  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordEmployeeNumber.name, schema: KeywordEmployeeNumberSchema },
  { name: KeywordShift.name, schema: KeywordShiftSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },

  { name: LocationBucket.name, schema: LocationBucketSchema },
  { name: Location.name, schema: LocationSchema },

  { name: Bank.name, schema: BankSchema },

  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },

  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },

  { name: Voucher.name, schema: VoucherSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },

  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },

  { name: Redeem.name, schema: RedeemSchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },
  { name: Lov.name, schema: LovSchema },
  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
  { name: SftpConfig.name, schema: SftpConfigSchema },
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
    HttpModule,
    LoggingModule,
    AccountModule,
    MongooseModule.forFeature(listModel),
    MongooseModule.forFeature(listModel, 'secondary'),
    ClientsModule.register([
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.sftp[0],
    ]),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisDataMaster),
    // StockModule,
    SlconfigModule,
  ],
  controllers: [TelegramController],
  providers: [
    ApplicationService,
    LoggingInterceptor,
    ChannelService,
    AccountService,
    KeywordService,
    NotificationService,
    StockService,
    VoucherService,
    TransactionOptionalService,
    ProgramServiceV2,
    // ProgramServiceV3,
    TelegramService,
    StockService,
    VoucherService,
    NotificationContentService,
    LovService,
    SftpService,
    ExceptionHandler,
    SlRedisService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoucherUpdateService,
    VoteService,
  ],
})
export class TelegramModule {}
