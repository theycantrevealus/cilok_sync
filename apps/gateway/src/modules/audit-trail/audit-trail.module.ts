import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

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
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import { AuditTrailController } from './controller/audit-trail.controller';
import { AuditTrail, AuditTrailSchema } from './models/audit-trail.model';
import { AuditTrailService } from './services/audit-trail.service';

const listModels = [
  { name: AuditTrail.name, schema: AuditTrailSchema },
  { name: Channel.name, schema: ChannelSchema },
  { name: Authorization.name, schema: AuthorizationSchema },
  { name: Account.name, schema: AccountSchema },
  { name: Role.name, schema: RoleSchema },
  { name: AccountLocation.name, schema: AccountLocationSchema },
  { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
  { name: Keyword.name, schema: KeywordSchema },
  { name: ProgramV2.name, schema: ProgramV2Schema },
  { name: SystemConfig.name, schema: SystemConfigSchema },
  { name: KeywordPriority.name, schema: KeywordPrioritySchema },
  { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
  { name: Lov.name, schema: LovSchema },
  { name: APILog.name, schema: APILogSchema },
];

@Module({
  imports: [
    HttpModule,
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
    MongooseModule.forFeature(listModels),
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
    MongooseModule.forFeature(listModels, 'secondary'),
  ],
  controllers: [AuditTrailController],
  providers: [
    AuditTrailService,
    ChannelService,
    AccountService,
    ApplicationService,
    SlRedisService,
  ],
  exports: [],
})
export class AuditTrailModule {
  //
}
