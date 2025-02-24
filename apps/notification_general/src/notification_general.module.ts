import { Environtment } from '@configs/environtment';
import EsbBackendConfig from '@configs/esb-backend.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import { RedisDataMaster, RedisProgram } from '@configs/redis/redis.module';
import SmsBackendConfig from '@configs/sms.config';
import {
  DeductPoint,
  DeductPointSchema,
} from '@deduct/models/deduct.point.model';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import * as redisStore from 'cache-manager-ioredis';
import { join } from 'path';

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
import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { EsbInboxIntegration } from '@/esb/integration/esb.inbox.integration';
import { EsbNotificationIntegration } from '@/esb/integration/esb.notification.integration';
import { EsbInboxService } from '@/esb/services/esb.inbox.service';
import { EsbNotificationService } from '@/esb/services/esb.notification.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import { Location, LocationSchema } from '@/location/models/location.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { MailService } from '@/mail/service/mail.service';
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
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';

import mytselBackendConfig from '../../gateway/src/configs/mytsel-backend.config';
import { MyTselInboxIntegration } from '@/mytsel/integration/mytsel.inbox.integration';
import { MyTselPushNotifIntegration } from '@/mytsel/integration/mytsel.pushnotif.integration';
import { MyTselInboxService } from '@/mytsel/services/mytsel.inbox.service';
import { MyTselPushNotifService } from '@/mytsel/services/mytsel.pushnotif.service';
import { ExceptionHandler } from '../../utils/logger/handler';
import { WinstonModule } from '../../utils/logger/module';
import { WinstonCustomTransport } from '../../utils/logger/transport';
import {
  NotificationLog,
  NotificationLogSchema,
} from './models/notification.log.model';
import { NotificationGeneralController } from './notification_general.controller';
import { NotificationKafkaService } from './notification_general.service';
import { NotificationLogService } from './services/notification.log.service';
import { SendNotificationService } from './services/send-notification.service';
import { SendNotificationGeneralService } from './services/send-notification-general.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        mongoConfig,
        EsbBackendConfig,
        SmsBackendConfig,
        mytselBackendConfig,
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
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        if (
          configService.get<string>('NODE_ENV') === '' ||
          !configService.get<string>('NODE_ENV') ||
          configService.get<string>('NODE_ENV') === 'development'
        ) {
          return {
            transport: {
              host: configService.get<string>('MAIL_HOST'),
              secure: false,
              auth: {
                user: configService.get<string>('MAIL_USERNAME'),
                pass: configService.get<string>('MAIL_PASSWORD'),
              },
            },
            defaults: {
              from: configService.get<string>('MAIL_FROM_ADDRESS'),
            },
            template: {
              dir: join(process.cwd() + '/src/modules/mail/', 'templates'),
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
          };
        } else {
          return {
            transport: {
              host: configService.get<string>('MAIL_HOST'),
              port: configService.get<number>('MAIL_PORT'),
              secure: false,
              tls: {
                rejectUnauthorized: false,
              },
            },
            defaults: {
              from: configService.get<string>('MAIL_FROM_ADDRESS'),
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: Lov.name, schema: LovSchema },
      { name: PIC.name, schema: PICSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },
      { name: Location.name, schema: LocationSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: Keyword.name, schema: KeywordSchema },

      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },

      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
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
          transports: WinstonCustomTransport[targetEnv].notification_general,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisProgram),
    BullModule.registerQueueAsync(RedisDataMaster),
    HttpModule,
    ClientsModule.registerAsync([
      // KafkaConn.notification[0],
      KafkaConn.transaction_master[0],
      KafkaConn.notification_general[0],

      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.notification_general[0],
    ]),
  ],
  controllers: [NotificationGeneralController],
  providers: [
    NotificationKafkaService,
    SendNotificationService,
    SmsIntegrationService,
    EsbNotificationService,
    EsbInboxService,
    EsbNotificationIntegration,
    EsbInboxIntegration,
    MailService,
    ApplicationService,
    NotificationContentService,
    CallApiConfigService,
    SendNotificationGeneralService,
    ExceptionHandler,
    LovService,
    ProgramServiceV2,
    AccountService,
    NotificationService,
    TransactionOptionalService,
    NotificationLogService,
    SlconfigService,
    SlRedisService,
    MyTselInboxIntegration,
    MyTselInboxService,
    MyTselPushNotifIntegration,
    MyTselPushNotifService,
  ],
})
export class NotificationModule {}
