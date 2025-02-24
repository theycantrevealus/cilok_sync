import applicationConfig from '@configs/application.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import {
  RedisDataMaster,
  RedisMultibonus,
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
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
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

import { MultiBonusController } from './multi_bonus.controller';
import { MultiBonusLogService } from './multi_bonus.log.service';
import { MultiBonusPayloadService } from './multi_bonus.payload.service';
import { MultiBonusService } from './multi_bonus.service';
import { RedeemProcessor } from './processor/redeem.processor';

const listModel = [
  { name: Keyword.name, schema: KeywordSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Account.name, schema: AccountSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: Role.name, schema: RoleSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Lov.name, schema: LovSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },

  { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
  { name: Location.name, schema: LocationSchema },
  { name: KeywordNotification.name, schema: KeywordNotificationSchema },
  { name: KeywordType.name, schema: KeywordTypeSchema },
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
  { name: VoucherImport.name, schema: VoucherImportSchema },
  { name: VoucherBatch.name, schema: VoucherBatchSchema },
  { name: VoucherUpdate.name, schema: VoucherUpdateSchema },
  { name: VoucherTask.name, schema: VoucherTaskSchema },

  { name: SftpConfig.name, schema: SftpConfigSchema },

  { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
  { name: ProgramNotification.name, schema: ProgramNotificationSchema },
  { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
  { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
  { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
  { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

  { name: MaxRedeemThresholds.name, schema: MaxRedeemThresholdsSchema },
  { name: CheckRedeem.name, schema: CheckRedeemSchema },

  { name: Vote.name, schema: VoteSchema },
  { name: VoteOption.name, schema: VoteOptionSchema },
  { name: TransactionVote.name, schema: TransactionVoteSchema },

  { name: Redeem.name, schema: RedeemSchema },

  { name: StockSummary.name, schema: StockSummarySchema },
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
    MongooseModule.forFeature(listModel),
    MongooseModule.forFeature(listModel, 'secondary'),
    ClientsModule.registerAsync([
      KafkaConn.notification[0],
      KafkaConn.refund[0],
      KafkaConn.redeem_low[0],
      KafkaConn.coupon_low[0],
      KafkaConn.notification_general[0],
      KafkaConn.voucher[0],
      KafkaConn.sftp[0],

      KafkaConnProducer.notification[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.redeem_low[0],
      KafkaConnProducer.coupon_low[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.sftp[0],
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
          transports: WinstonCustomTransport[targetEnv].multi_bonus,
        };
      },
    }),
    HttpModule.register({}),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisSftp),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisMultibonus),
  ],
  controllers: [MultiBonusController],
  providers: [
    MultiBonusService,
    MultiBonusLogService,
    ExceptionHandler,
    MultiBonusPayloadService,
    TransactionOptionalService,
    ApplicationService,
    AccountService,
    SlRedisService,
    KeywordService,
    NotificationService,
    StockService,
    VoucherService,
    LovService,
    SftpService,
    ProgramServiceV2,
    MaxRedeemTresholdsService,
    CallApiConfigService,
    VoteService,
    VoucherUpdateService,
    SchedulerRegistry,
    RedeemProcessor,
  ],
})
export class MultiBonusModule {}
