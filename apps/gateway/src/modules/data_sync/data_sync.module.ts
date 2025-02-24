import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { DataSync, DataSyncSchema } from '@data_sync/models/data.sync.model';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

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
import { LoggingModule } from '@/logging/logging.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';

import { DataSyncController } from './controllers/data_sync.controller';
import { DataSyncService } from './services/data_sync.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      KafkaConn.data_sync[0],
      KafkaConnProducer.data_sync[0],
    ]),
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: DataSync.name, schema: DataSyncSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    LoggingModule,
    HttpModule,
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [DataSyncController],
  providers: [ApplicationService, DataSyncService, SlRedisService],
  exports: [DataSyncService],
})
export class DataSyncModule {
  //
}
