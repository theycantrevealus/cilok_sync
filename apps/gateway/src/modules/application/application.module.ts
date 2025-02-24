import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import SoapConfig from '@configs/dsp.soap';
import { Environtment } from '@configs/environtment';
import KafkaConfig from '@configs/kafka.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { RewardCatalog } from '@configs/reward.catalog';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { CACHE_MANAGER, Inject, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import {
  InjectModel,
  MongooseModule,
  MongooseModuleOptions,
} from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';
import { Cache } from 'cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { Model } from 'mongoose';
import * as path from 'path';

import { AccountModule } from '@/account/account.module';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import {
  Authorization,
  AuthorizationDocument,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { ApplicationController } from '@/application/controllers/application.controller';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { AuditTrailModule } from '@/audit-trail/audit-trail.module';
import { BankModule } from '@/bank/bank.module';
import { CampaignModule } from '@/campaign/campaign.module';
import { ChannelModule } from '@/channel/channel.module';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { CLIModule } from '@/cli/cli.module';
// disable migration command
import { MigrationCommand } from '@/cli/commands/migration.command';
import { Seed } from '@/cli/commands/seed.command';
import { CrmbModule } from '@/crmb/crmb.module';
import { CronModule } from '@/cron/cron.module';
import { CustomerModule } from '@/customer/customer.module';
import { DataSyncModule } from '@/data_sync/data_sync.module';
import { E2ebiModule } from '@/e2ebi/e2ebi.module';
import { EsbModule } from '@/esb/esb.module';
import { ExampleModule } from '@/example/example.module';
import { InjectModule } from '@/inject/inject.module';
import { InventoryModule } from '@/inventory/inventory.module';
import { KeywordModule } from '@/keyword/keyword.module';
import {
  Keyword,
  KeywordDocument,
  KeywordSchema,
} from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LinkAjaModule } from '@/linkaja/link.aja.module';
import { LocationModule } from '@/location/location.module';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LuckyDrawModule } from '@/lucky-draw/lucky.draw.module';
import { MailModule } from '@/mail/mail.module';
import { MerchantModule } from '@/merchant/merchant.module';
import { MigrationModule } from '@/migration/module';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { NotificationModule } from '@/notification/notification.module';
import { OauthModule } from '@/oauth/oauth.module';
import { PartnerModule } from '@/partner/partner.module';
import { PICModule } from '@/pic/pic.module';
import { ProductModule } from '@/product/product.module';
import { ProgramModule } from '@/program/program.module';
import { RemedyToolsModule } from '@/remedy_tools/remedy.tools.module';
import { ReportModule } from '@/report/report.module';
import { StockModule } from '@/stock/stock.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { TransactionModule } from '@/transaction/transaction.module';
import { VoteModule } from '@/vote/vote.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '../log_viewer/dist/'),
      renderPath: '/logger',
      exclude: ['/api*'],
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
        RewardCatalog,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
        KafkaConfig,
        SoapConfig,
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db-name'),
        // user: configService.get<string>('mongo.db-user'),
        // pass: configService.get<string>('mongo.db-password'),
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

      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: Lov.name, schema: LovSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
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
          transports: WinstonCustomTransport[targetEnv].gateway,
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<BullRootModuleOptions> => {
        if (configService.get<string>('redis.password') !== '') {
          return {
            redis: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
              password: configService.get<string>('redis.password'),
            },
          };
        } else {
          return {
            redis: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      KafkaConn.notification_general[0],
      KafkaConnProducer.notification_general[0],
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    LoggingModule,
    OauthModule,
    AccountModule,
    MerchantModule,
    ProgramModule,
    CustomerModule,
    ProductModule,
    NotificationModule,
    PartnerModule,
    LovModule,
    LocationModule,
    ChannelModule,
    KeywordModule,
    BankModule,
    ExampleModule,
    CampaignModule,
    PICModule,
    TransactionModule,
    EsbModule,
    InjectModule,
    InventoryModule,
    E2ebiModule,
    StockModule,
    MailModule,
    LinkAjaModule,
    CronModule,
    RemedyToolsModule,
    ReportModule,
    MigrationModule,
    TelegramModule,
    DataSyncModule,
    LuckyDrawModule,
    CrmbModule,
    // VoucherModule,
    VoteModule,
    AuditTrailModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, Seed, ExceptionHandler, SlRedisService],
  exports: [ApplicationService],
})
export class ApplicationModule {
  constructor(
    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @InjectModel(Authorization.name)
    private authorizationModel: Model<AuthorizationDocument>,
  ) {
    this.authorizationModel.find().then(async (data) => {
      data.map(async (a) => {
        // await this.cacheManager.set(a.url, a.role).then(() => {
        //   console.log(`Registering role config : ${a.url}`);
        // });

        await this.cacheManager.set(a.url, a.role, { ttl: 0 });
        // console.log(`Registering role config : ${a.url}`);
        await this.cacheManager.set(a.url, a.role);
      });
    });
  }
}
