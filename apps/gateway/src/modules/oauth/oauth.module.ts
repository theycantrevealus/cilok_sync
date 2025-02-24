import { HttpModule } from '@nestjs/axios';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '../account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '../account/models/account.location.model';
import { Account, AccountSchema } from '../account/models/account.model';
import { Role, RoleSchema } from '../account/models/role.model';
import { AccountService } from '../account/services/account.service';
import { Channel, ChannelSchema } from '../channel/models/channel.model';
import { ChannelService } from '../channel/services/channel.service';
import { LoggingModule } from '../logging/logging.module';
import {
  LogOauthRefreshTokenMiddleware,
  LogOauthSignInMiddleware,
  LogOauthSignOutMiddleware,
} from '../logging/middlewares/oauth.middleware';
import { RefreshTokenController } from './controllers/refresh-token/refresh-token.controller';
import { SigninController } from './controllers/signin/signin.controller';
import { SignoutController } from './controllers/signout/signout.controller';
import { RefreshTokenService } from './services/refresh-token/refresh-token.service';
import { SignInService } from './services/signin/signin.service';
import { SignOutService } from './services/signout/signout.service';
import { Authorization, AuthorizationSchema } from '../account/models/authorization.model';
import { SystemConfig, SystemConfigSchema } from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { ApplicationService } from "@/application/services/application.service";
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { SlRedisService } from "@slredis/slredis.service";
import { Lov, LovSchema } from "@/lov/models/lov.model";

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
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
  controllers: [SigninController, SignoutController, RefreshTokenController],
  providers: [
    SignInService,
    SignOutService,
    RefreshTokenService,
    ChannelService,
    AccountService,
    ApplicationService,
    SlRedisService,
  ],
  exports: [SignInService],
})
export class OauthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LogOauthRefreshTokenMiddleware)
      .forRoutes({ path: 'oauth/refresh-token', method: RequestMethod.POST });

    consumer
      .apply(LogOauthSignInMiddleware)
      .forRoutes({ path: 'oauth/signin', method: RequestMethod.POST });

    consumer
      .apply(LogOauthSignOutMiddleware)
      .forRoutes({ path: 'oauth/signout', method: RequestMethod.POST });
  }
}
