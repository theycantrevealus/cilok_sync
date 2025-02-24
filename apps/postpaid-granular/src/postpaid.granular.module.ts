import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import KafkaConfig from '@configs/kafka.config';
import MongoConfig from '@configs/mongo.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
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
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { Bid, BidSchema } from '@/transaction/models/bid/bid.model';
import { TransactionModule } from '@/transaction/transaction.module';

import { Environtment } from '../../batch/src/configs/environtment';
import {
  KafkaMbseConsumerLogs,
  KafkaMbseConsumerLogsSchema,
} from '../models/kafka_mbse_consumer_logs';
import {
  PostpaidGranularLog,
  PostPaidGranularLogSchema,
} from '../models/postpaid_granular_log';
import { SlIntegration } from './integration/sl.integration';
import { PostpaidGranularController } from './postpaid.granular.controller';
import { PostpaidGranularService } from './postpaid.granular.service';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

@Module({
  imports: [
    HttpModule,
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        CoreBackendConfig,
        KafkaConfig,
      ],
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
          transports: WinstonCustomTransport[targetEnv].postpaid_granular,
        };
      },
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
      { name: Keyword.name, schema: KeywordSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: PostpaidGranularLog.name, schema: PostPaidGranularLogSchema },
      { name: KafkaMbseConsumerLogs.name, schema: KafkaMbseConsumerLogsSchema },
      { name: Bid.name, schema: BidSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: Lov.name, schema: LovSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    TransactionModule,
  ],
  controllers: [PostpaidGranularController],
  providers: [
    PostpaidGranularService,
    SlIntegration,
    UtilsService,
    ChannelService,
    AccountService,
    ExceptionHandler,
    ApplicationService,
    SlRedisService,
  ],
})
export class PostpaidGranularModule {}
