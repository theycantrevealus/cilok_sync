import ApplicationConfig from '@configs/application.config';
import { Environtment } from '@configs/environtment';
import InjectConfig from '@configs/inject.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import { RedisInject } from '@configs/redis/redis.module';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
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
import { CustomerModule } from '@/customer/customer.module';
import {
  InjectPointModel,
  InjectPointModelSchema,
} from '@/inject/models/inject.point.model';
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
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import { InjectPointController } from './inject.point.controller';
import { InjectPointService } from './inject.point.service';
import { InjectPointProcessor } from './processors/inject.point.processor';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, ApplicationConfig, mongoConfig, InjectConfig],
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
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: InjectPointModel.name, schema: InjectPointModelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.inject_point[0],
      KafkaConnProducer.inject_point[0],
    ]),
    HttpModule,
    CustomerModule,
    BullModule.registerQueueAsync(RedisInject),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [InjectPointController],
  providers: [
    ApplicationService,
    ChannelService,
    AccountService,
    InjectPointService,
    InjectPointProcessor,
    SlRedisService,
  ],
  exports: [InjectPointService],
})
export class InjectPointModule {}
