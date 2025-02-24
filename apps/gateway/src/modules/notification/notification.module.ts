import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { WinstonModule } from '../../../../utils/logger/module';
import { WinstonCustomTransport } from '../../../../utils/logger/transport';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '../account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '../account/models/account.location.model';
import { Account, AccountSchema } from '../account/models/account.model';
import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';
import { Role, RoleSchema } from '../account/models/role.model';
import { AccountService } from '../account/services/account.service';
import { Channel, ChannelSchema } from '../channel/models/channel.model';
import { ChannelService } from '../channel/services/channel.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { LoggingModule } from '../logging/logging.module';
import { APILog, APILogSchema } from '../logging/models/api.logs.model';
import { NotificationController } from './controllers/notification.controller';
import { NotificationFirebaseController } from './controllers/notification.firebase.controller';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from './models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './models/notification.model';
import { NotificationService } from './services/notification.service';
import { SystemConfig, SystemConfigSchema } from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { ApplicationService } from "@/application/services/application.service";
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { SlRedisService } from "@slredis/slredis.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
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
    LoggingModule,
    HttpModule,
  ],
  controllers: [NotificationController, NotificationFirebaseController],
  providers: [
    ApplicationService,
    NotificationService,
    LoggingInterceptor,
    AccountService,
    ChannelService,
    SlRedisService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {
  //
}
