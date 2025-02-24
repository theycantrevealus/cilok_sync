import applicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import redisConfig from '@configs/redis.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApplicationConfig } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
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

import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { Location, LocationSchema } from './models/location.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Location.name, schema: LocationSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        applicationConfig,
        mongoConfig,
        redisConfig,
        coreBackendConfig,
      ],
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
    MongooseModule.forFeature([]),
    ClientsModule.registerAsync([
      KafkaConn.notification[0],
      KafkaConnProducer.notification[0],
    ]),
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
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [LocationController],
  providers: [
    LocationService,
    ApplicationService,
    SlconfigService,
    SlRedisService,
  ],
})
export class LocationModule {}
