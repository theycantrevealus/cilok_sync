import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import * as redisStore from 'cache-manager-ioredis';

import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import {
  CheckRedeem,
  CheckRedeemSchema,
} from '@/transaction/models/redeem/check.redeem.model';
import {
  MaxRedeemThresholds,
  MaxRedeemThresholdsSchema,
} from '@/transaction/models/redeem/max_redeem.treshold.model';
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import { ExceptionHandler } from '../../utils/logger/handler';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { CronConfig, CronConfigSchema } from './models/cron.config.model';
import { CronLog, CronLogSchema } from './models/cron.log.model';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV == undefined
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [Environtment, ApplicationConfig, MongoConfig, CoreBackendConfig],
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
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: CronConfig.name, schema: CronConfigSchema },
      { name: CronLog.name, schema: CronLogSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Voucher.name, schema: VoucherSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      {
        name: MaxRedeemThresholds.name,
        schema: MaxRedeemThresholdsSchema,
      },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.refund[0],
      KafkaConn.cron[0],
      KafkaConn.redeem[0],
      KafkaConn.redeem_high[0],
      KafkaConn.redeem_low[0],

      KafkaConnProducer.refund[0],
      KafkaConnProducer.cron[0],
      KafkaConnProducer.redeem[0],
      KafkaConnProducer.redeem_high[0],
      KafkaConnProducer.redeem_low[0],
    ]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
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
          transports: WinstonCustomTransport[targetEnv].cron,
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
  ],
  controllers: [CronController],
  providers: [
    CronService,
    ExceptionHandler,
    MaxRedeemTresholdsService,
    SlconfigService,
    SlRedisService,
  ],
})
export class CronModule {}
