import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

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
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import { Channel, ChannelSchema } from '../channel/models/channel.model';
import { ChannelService } from '../channel/services/channel.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { LoggingModule } from '../logging/logging.module';
import { APILog, APILogSchema } from '../logging/models/api.logs.model';
import { AccountController } from './controllers/account.controller';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from './models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from './models/account.location.model';
import { Account, AccountSchema } from './models/account.model';
import {
  Authorization,
  AuthorizationSchema,
} from './models/authorization.model';
import { Role, RoleSchema } from './models/role.model';
import { AccountService } from './services/account.service';

@Module({
  imports: [
    LoggingModule,
    HttpModule,
    /*
    MongooseModule.forFeatureAsync([
      {
        name: Account.name,
        useFactory: () => {
          const schema = AccountSchema;
          schema.pre('save', function (next) {
            return next();
          });

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate();
            // update['$inc'] = { __v: 1 };
            next();
          });

          return schema;
        },
      },
    ]),
    */
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      {
        name: AccountCredentialLog.name,
        schema: AccountCredentialLogSchema,
      },
      { name: APILog.name, schema: APILogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
  ],
  controllers: [AccountController],
  providers: [
    AccountService,
    ChannelService,
    LoggingInterceptor,
    ApplicationService,
    SlRedisService,
  ],
  exports: [AccountService],
})
export class AccountModule {
  //
}
