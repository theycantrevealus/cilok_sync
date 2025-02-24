import CoreBackendConfig from '@configs/core-backend.config';
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
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import { SftpService } from '@sftp/sftp.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
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
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
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

import { InventoryHttpservice } from '../config/inventory-http.service';
import { ProductController } from './controllers/product.controller';
import { ProductIntegration } from './integrations/product.integration';
import {
  ProductInventory,
  ProductInventorySchema,
} from './models/product.model';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [CoreBackendConfig],
    }),
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ProductInventory.name, schema: ProductInventorySchema },
      { name: Stock.name, schema: StockSchema },
      { name: StockLogs.name, schema: StockLogSchema },
      { name: StockReserve.name, schema: StockReserveSchema },
      { name: Location.name, schema: LocationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: StockThreshold.name, schema: StockThresholdSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: Location.name, schema: LocationSchema },
      { name: Bank.name, schema: BankSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },

      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
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
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: VoucherUpdate.name, schema: VoucherUpdateSchema },

      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: StockSummary.name, schema: StockSummarySchema },
    ]),
    MongooseModule.forFeature(
      [{ name: Voucher.name, schema: VoucherSchema }],
      'secondary',
    ),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisProgram),
    ClientsModule.registerAsync([
      KafkaConn.eligibility[0],
      KafkaConn.notification[0],
      KafkaConn.deduct[0],
      KafkaConn.coupon[0],
      KafkaConn.void[0],
      KafkaConn.transaction_master[0],
      KafkaConn.redeem[0],
      KafkaConn.redeem_high[0],
      KafkaConn.redeem_low[0],
      KafkaConn.notification_general[0],
      KafkaConn.inject_point[0],

      KafkaConnProducer.eligibility[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.redeem[0],
      KafkaConnProducer.redeem_high[0],
      KafkaConnProducer.redeem_low[0],
      KafkaConnProducer.notification_general[0],
    ]),
  ],
  controllers: [ProductController],
  providers: [
    LoggingInterceptor,
    ChannelService,
    AccountService,
    ProductService,
    ProductIntegration,
    InventoryHttpservice,
    StockService,
    ApplicationService,
    SlRedisService,
    KeywordService,
    ProgramServiceV2,
    NotificationService,
    StockService,
    VoucherService,
    LovService,
    TransactionOptionalService,
    SftpService,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    VoucherUpdateService,
    ExceptionHandler,
  ],
  exports: [],
})
export class ProductModule {}
