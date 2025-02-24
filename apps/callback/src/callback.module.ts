import applicationConfig from '@configs/application.config';
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
import { CallApiConfigService } from '@/application/services/call-api-config.service';
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
  MerchantV2,
  MerchantV2Schema,
} from '@/merchant/models/merchant.model.v2';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { ProgramModule } from '@/program/program.module';

import { ExceptionHandler } from '../../utils/logger/handler';
import { CallbackController } from './callback.controller';
import { CallbackService } from './callback.service';
import EsbBackendConfig from './configs/esb-backend.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV == undefined
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        applicationConfig,
        mongoConfig,
        coreBackendConfig,
        EsbBackendConfig,
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
    BullModule.registerQueueAsync(RedisDataMaster),
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
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.callback[0],
      KafkaConn.notification_general[0],

      KafkaConnProducer.callback[0],
      KafkaConnProducer.notification_general[0],
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
          transports: WinstonCustomTransport[targetEnv].callback,
        };
      },
    }),
    HttpModule,
    CustomerModule,
    LovModule,
    ProgramModule,
  ],
  controllers: [CallbackController],
  providers: [
    CallbackService,
    CallApiConfigService,
    ExceptionHandler,
    ApplicationService,
    NotificationContentService,
    SlconfigService,
    SlRedisService,
  ],
})
export class CallbackModule {}
