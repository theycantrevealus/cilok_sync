import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { KafkaService } from '@deduct/kafka.service';
import {
  DeductPoint,
  DeductPointSchema,
} from '@deduct/models/deduct.point.model';
import { MerchantService } from '@deduct/services/merchant.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
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
import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { CustomerModule } from '@/customer/customer.module';
import { KeywordModule } from '@/keyword/keyword.module';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
// import { KafkaController } from './kafka.controller';
// import { KafkaService } from './kafka.service';
// import { DeductPoint, DeductPointSchema } from './models/deduct.point.model';
// import { MerchantService } from './services/merchant.service';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import {
  PrepaidGranularLog,
  PrePaidGranularLogSchema,
} from '../../prepaid-granular/models/prepaid_granular_log';
import { DeductHighController } from './deduct_high.controller';
import { DeductHighService } from './deduct_high.service';

const listModel = [
  { name: PrepaidGranularLog.name, schema: PrePaidGranularLogSchema },
  { name: AuctionBidder.name, schema: AuctionBidderSchema },
  { name: DeductPoint.name, schema: DeductPointSchema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: Lov.name, schema: LovSchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: Keyword.name, schema: KeywordSchema },
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
      ],
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
      KafkaConn.refund[0],
      KafkaConn.deduct_high[0],
      KafkaConn.deduct[0],
      KafkaConn.outbound[0],
      KafkaConn.void[0],
      KafkaConn.inbound[0],
      KafkaConn.notification[0],
      KafkaConn.voucher[0],
      KafkaConn.coupon[0],
      KafkaConn.transaction_master[0],
      KafkaConn.inject_point[0],
      KafkaConn.inject_point_high[0],
      KafkaConn.donation[0],
      KafkaConn.merchandise[0],
      KafkaConn.sftp[0],
      KafkaConn.reporting_point_event[0],
      KafkaConn.vote[0],
      KafkaConn.auction[0],

      KafkaConnProducer.refund[0],
      KafkaConnProducer.deduct_high[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.outbound[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.inbound[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.voucher[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.inject_point_high[0],
      KafkaConnProducer.donation[0],
      KafkaConnProducer.merchandise[0],
      KafkaConnProducer.sftp[0],
      KafkaConnProducer.reporting_point_event[0],
      KafkaConnProducer.vote[0],
      KafkaConnProducer.auction[0],
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
          transports: WinstonCustomTransport[targetEnv].deduct_high,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    HttpModule.register({}),
    KeywordModule,
    CustomerModule,
    LovModule,
  ],
  controllers: [DeductHighController],
  providers: [
    DeductHighService,
    KafkaService,
    ApplicationService,
    MerchantService,
    NotificationContentService,
    SlconfigService,
    SlRedisService,
    TransactionOptionalService,
  ],
})
export class DeductHighModule {}
