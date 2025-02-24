import applicationConfig from '@configs/application.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import {
  RedisDataMaster,
  RedisProgram,
  RedisSftp,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SftpConfig, SftpConfigSchema } from '@sftp/models/sftp.config.model';
import {
  SftpOutgoingLog,
  SftpOutgoingLogSchema,
} from '@sftp/models/sftp.outgoing.log';
import { SftpService } from '@sftp/sftp.service';
import { SlRedisService } from '@slredis/slredis.service';
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
  NotificationLog,
  NotificationLogSchema,
} from '@/application/models/notification.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import {
  CustomerBadge,
  CustomerBadgeSchema,
} from '@/customer/models/customer.badge.model';
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
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
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

import { MerchantService } from './services/merchant.service';
import { VoteController } from './vote.controller';
import { VoteLogService } from './vote.log.service';
import { KafkaVoteService } from './vote.service';

const list_model = [
  { name: Account.name, schema: AccountSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Lov.name, schema: LovSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: Stock.name, schema: StockSchema },
  { name: StockLogs.name, schema: StockLogSchema },
  { name: StockReserve.name, schema: StockReserveSchema },
  { name: Location.name, schema: LocationSchema },
  { name: NotificationLog.name, schema: NotificationLogSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Authorization.name, schema: AuthorizationSchema },

  { name: StockThreshold.name, schema: StockThresholdSchema },
  { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },
  { name: StockSummary.name, schema: StockSummarySchema },

  { name: Keyword.name, schema: KeywordSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },

  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },

  { name: Bank.name, schema: BankSchema },
  { name: CustomerBadge.name, schema: CustomerBadgeSchema },

  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Role.name, schema: RoleSchema },

  { name: Voucher.name, schema: VoucherSchema },
  { name: VerificationVoucher.name, schema: VerificationVoucherSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },

  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },

  { name: SftpOutgoingLog.name, schema: SftpOutgoingLogSchema },
  { name: SftpConfig.name, schema: SftpConfigSchema },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, MongoConfig, applicationConfig],
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
    MongooseModule.forFeature(list_model),
    MongooseModule.forFeature(list_model, 'secondary'),
    ClientsModule.registerAsync([
      KafkaConn.vote[0],
      KafkaConn.notification[0],
      KafkaConn.refund[0],
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.vote[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.reporting_statistic[0],
    ]),
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
          transports: WinstonCustomTransport[targetEnv].vote,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisProgram),
    LovModule,
    HttpModule,
  ],
  controllers: [VoteController],
  providers: [
    ApplicationService,
    NotificationContentService,
    StockService,
    KafkaVoteService,
    VoteService,
    VoteLogService,
    SlRedisService,
    NotificationService,
    ExceptionHandler,
    MerchantService,

    SchedulerRegistry,
    CallApiConfigService,
    MaxRedeemTresholdsService,
    ProgramServiceV2,
    AccountService,
    KeywordService,
    VoucherService,
    VoucherUpdateService,
    TransactionOptionalService,
    SftpService,
  ],
  exports: [KafkaVoteService],
})
export class VoteModule {}
