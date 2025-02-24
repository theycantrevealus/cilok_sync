import { RedisDataMaster, RedisMerchant } from "@configs/redis/redis.module";
import { HttpModule } from '@nestjs/axios';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { Location, LocationSchema } from '@/location/models/location.model';

import { AccountModule } from '../account/account.module';
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
import { MerchantController } from './controllers/merchant.controller';
import { MerchantV2Controller } from './controllers/merchant.controller.v2';
import { MerchantOutletController } from './controllers/merchant.outlet.controller';
import { MerchantPatnerController } from './controllers/merchant.patner.controller';
import { OutletController } from './controllers/outlet.controller';
import { Merchant, MerchantSchema } from './models/merchant.model';
import { MerchantV2, MerchantV2Schema } from './models/merchant.model.v2';
import {
  MerchantOutlet,
  MerchantOutletSchema,
} from './models/merchant.outlet.model';
import {
  MerchantPatner,
  MerchantPatnerSchema,
} from './models/merchant.patner.model';
import { Outlet, OutletSchema } from './models/outlet.model';
import { MerchantProcessor } from './processors/merchant.processor';
import { MerchantOutletService } from './services/merchant.outlet.service';
import { MerchantPatnerService } from './services/merchant.patner.service';
import { MerchantService } from './services/merchant.service';
import { MerchantV2Service } from './services/merchant.service.v2';
import { OutletService } from './services/outlet.service';
import { SystemConfig, SystemConfigSchema } from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { ApplicationService } from "@/application/services/application.service";
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

      { name: Merchant.name, schema: MerchantSchema },
      { name: Outlet.name, schema: OutletSchema },
      { name: MerchantOutlet.name, schema: MerchantOutletSchema },
      { name: MerchantV2.name, schema: MerchantV2Schema },
      { name: MerchantPatner.name, schema: MerchantPatnerSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Location.name, schema: LocationSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    BullModule.registerQueueAsync(RedisMerchant),
    LoggingModule,
    AccountModule,
    HttpModule,
  ],
  controllers: [
    MerchantController,
    OutletController,
    MerchantOutletController,
    MerchantV2Controller,
    MerchantPatnerController,
  ],
  providers: [
    ApplicationService,
    SlRedisService,
    MerchantProcessor,
    MerchantService,
    ChannelService,
    LoggingInterceptor,
    AccountService,
    OutletService,
    MerchantOutletService,
    MerchantV2Service,
    MerchantPatnerService,
  ],
  exports: [MerchantService],
})
export class MerchantModule {
  //
}
