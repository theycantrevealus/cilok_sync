import ApplicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
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
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
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
import { ProgramModule } from '@/program/program.module';
import { Stock, StockSchema } from '@/stock/models/stock.model';
import { TransactionMasterService } from '@/transaction/services/transaction_master/transaction_master.service';

import { ExceptionHandler } from '../../utils/logger/handler';
import { RefundPoint, RefundPointSchema } from './model/refund.point.model';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, ApplicationConfig, mongoConfig, coreBackendConfig],
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
      { name: RefundPoint.name, schema: RefundPointSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: TransactionMaster.name, schema: TransactionMasterSchema },
      { name: Stock.name, schema: StockSchema },
      { name: Keyword.name, schema: KeywordSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.refund[0],
      KafkaConn.notification[0],
      KafkaConn.reporting_point_event[0],
      KafkaConn.notification_general[0],

      KafkaConnProducer.refund[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.reporting_point_event[0],
      KafkaConnProducer.notification_general[0],
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
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
          transports: WinstonCustomTransport[targetEnv].refund,
        };
      },
    }),
    HttpModule,
    CustomerModule,
    LovModule,
    ProgramModule,
  ],
  controllers: [RefundController],
  providers: [
    RefundService,
    ApplicationService,
    NotificationContentService,
    TransactionMasterService,
    ExceptionHandler,
    TransactionOptionalService,
    SlRedisService,
  ],
})
export class RefundModule {}
