import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel } from 'diagnostics_channel';

import { AccountModule } from '@/account/account.module';
import {
  AccountCredentialLog,
  AccountCredentialLogSchema,
} from '@/account/models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationSchema,
} from '@/account/models/account.location.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { POINController } from '@/poin/controllers/poin.controller';
import { POIN, POINSchema } from '@/poin/models/poin.model';
import { POINService } from '@/poin/services/poin.service';
import { Authorization, AuthorizationSchema } from '../account/models/authorization.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: POIN.name, schema: POINSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
    ]),
    LoggingModule,
    AccountModule,
    HttpModule,
  ],
  controllers: [POINController],
  providers: [POINService, LoggingInterceptor, AccountService, ChannelService],
  exports: [POINService],
})
export class POINModule {}
