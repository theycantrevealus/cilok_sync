import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import SoapConfig from '@configs/dsp.soap';
import { Environtment } from '@configs/environtment';
import KafkaConfig from '@configs/kafka.config';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { RedisDataMaster, RedisLocation } from '@configs/redis/redis.module';
import { RewardCatalog } from '@configs/reward.catalog';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Inject, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import * as redisStore from 'cache-manager-ioredis';

import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
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

import { SlRedisController } from './slredis.controller';
import { RedisConfigProcessor } from './slredis.processor';
import { SlRedisService } from './slredis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        !process.env.NODE_ENV ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === ''
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        // RewardCatalog,
        MongoConfig,
        RedisConfig,
        // CoreBackendConfig,
        // KafkaConfig,
        // SoapConfig,
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
          ttl: 24 * 60 * 60, // 1 day
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
        tlsAllowInvalidCertificates: configService.get<boolean>(
          'mongo.tls_allow_invalid_certificates',
        ),
        tls: configService.get<boolean>('mongo.tls'),
        authSource: configService.get<string>('mongo.auth_source'),
        directConnection: configService.get<boolean>('mongo.direct_connection'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [SlRedisController],
  providers: [SlRedisService, RedisConfigProcessor],
  exports: [SlRedisService],
})
export class SlRedisModule {
  constructor(
    @Inject(SlRedisService) private readonly slRedisService: SlRedisService,
  ) {
    this.slRedisService.reloadAll();
  }
}
