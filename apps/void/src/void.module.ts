import applicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { MerchantService } from '@deduct/services/merchant.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
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
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationModule } from '@/notification/notification.module';
import { OTP, OTPSchema } from '@/otp/models/otp.model';
import { OTPService } from '@/otp/services/otp.service';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { ProgramModule } from '@/program/program.module';
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';
import { EauctionService } from '@/transaction/services/eauction/eauction.service';
import { TransactionModule } from '@/transaction/transaction.module';

import { AuctionService } from '../../auction/src/auction.service';
import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import { ExceptionHandler } from '../../utils/logger/handler';
import { VoidKafkaConsumerController } from './void.controller';
import { VoidKafkaConsumerService } from './void.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, MongoConfig, CoreBackendConfig, applicationConfig],
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
    MongooseModule.forFeature([
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: OTP.name, schema: OTPSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: TransactionMaster.name, schema: TransactionMasterSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      {
        name: AccountCredentialLog.name,
        schema: AccountCredentialLogSchema,
      },
      { name: Redeem.name, schema: RedeemSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.notification[0],
      KafkaConn.notification_general[0],
      KafkaConn.refund[0],

      KafkaConnProducer.notification[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.refund[0],
      KafkaConnProducer.reporting_statistic[0],
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
          transports: WinstonCustomTransport[targetEnv].void,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    TransactionModule,
    ProgramModule,
    NotificationModule,
  ],
  controllers: [VoidKafkaConsumerController],
  providers: [
    ApplicationService,
    VoidKafkaConsumerService,
    NotificationContentService,
    OTPService,
    LovService,
    ExceptionHandler,
    SlconfigService,
    SlRedisService,
    UtilsService,
    MerchantService,
    AccountService,
    AuctionService,
    EauctionService,
  ],
})
export class VoidKafkaConsumerModule {}
