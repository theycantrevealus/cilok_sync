import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { RedisDataMaster, RedisProgram } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
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
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
import {
  KeywordEligibility,
  KeywordEligibilitySchema,
} from '@/keyword/models/keyword.eligibility.model';
import {
  KeywordEmployeeNumber,
  KeywordEmployeeNumberSchema,
} from '@/keyword/models/keyword.employee.number.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import {
  KeywordShift,
  KeywordShiftSchema,
} from '@/keyword/models/keyword.shift.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import {
  LocationHris,
  LocationHrisSchema,
} from '@/location/models/location.hris.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';
import { PIC, PICSchema } from '@/pic/models/pic.model';
import {
  ProgramApprovalLog,
  ProgramApprovalLogSchema,
} from '@/program/models/program.approval.log';
import {
  ProgramBlacklist,
  ProgramBlacklistSchema,
} from '@/program/models/program.blacklist.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import {
  ProgramNotification,
  ProgramNotificationSchema,
} from '@/program/models/program.notification.model.v2';
import {
  ProgramSegmentation,
  ProgramSegmentationSchema,
} from '@/program/models/program.segmentation.model';
import {
  ProgramTemplist,
  ProgramTemplistSchema,
} from '@/program/models/program.templist.model';
import {
  ProgramWhitelist,
  ProgramWhitelistSchema,
} from '@/program/models/program.whitelist.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { DataSyncController } from './data-sync.controller';
import { DataSyncService } from './data-sync.service';
import { DataSync, DataSyncSchema } from './models/data.sync.model';
import { AccountSyncService } from './services/accounts.sync.service';
import { DataSyncLogService } from './services/log.service';
import { RoleSyncService } from './services/roles.sync.service';

@Module({
  imports: [
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
    /*
    MongooseModule.forFeatureAsync([
      {
        name: Account.name,
        useFactory: () => {
          const schema = AccountSchema;
          schema.pre('save', function (next) {
            console.log('DATA SYNC - Triggered save');
            console.log(this);
            return next();
          });

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate();
            console.log('DATA SYNC - Triggered findOneAndUpdate');
            console.log(update);
            // update['$inc'] = { __v: 1 };
            next();
          });

          return schema;
        },
      },
    ]),
    */
    MongooseModule.forFeature([
      { name: DataSync.name, schema: DataSyncSchema },

      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: Location.name, schema: LocationSchema },
      { name: LocationHris.name, schema: LocationHrisSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Lov.name, schema: LovSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },

      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordEmployeeNumber.name, schema: KeywordEmployeeNumberSchema },
      { name: KeywordShift.name, schema: KeywordShiftSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },

      { name: PIC.name, schema: PICSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
    ]),
    HttpModule,
    BullModule.registerQueueAsync(RedisProgram),
    ClientsModule.registerAsync([
      KafkaConn.data_sync[0],
      KafkaConn.notification_general[0],

      KafkaConnProducer.data_sync[0],
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
          transports: WinstonCustomTransport[targetEnv].data_sync,
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
  controllers: [DataSyncController],
  providers: [
    DataSyncService,
    DataSyncLogService,
    ExceptionHandler,
    ApplicationService,
    LovService,
    ProgramServiceV2,
    AccountService,
    NotificationService,
    TransactionOptionalService,
    SlconfigService,
    SlRedisService,

    AccountSyncService,
    RoleSyncService,
  ],
})
export class DataSyncModule {}
