import applicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import * as redisStore from 'cache-manager-ioredis';

import {
  BatchProcessRowLog,
  BatchProcessRowLogSchema,
} from '@/application/models/batch-row.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';

import { UtilsService } from '../../utils/services/utils.service';
import { ManualProcessController } from './manual-process.controller';
import { ManualProcessService } from './manual-process.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, MongoConfig, applicationConfig, CoreBackendConfig],
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
        directConnection: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: BatchProcessRowLog.name, schema: BatchProcessRowLogSchema },

      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
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
    BullModule.registerQueueAsync(RedisDataMaster),
    ClientsModule.registerAsync([
      KafkaConn.manual_process[0],
      KafkaConnProducer.manual_process[0],
    ]),
    HttpModule,
  ],
  controllers: [ManualProcessController],
  providers: [ManualProcessService, UtilsService, SlconfigService],
})
export class ManualProcessModule {}
