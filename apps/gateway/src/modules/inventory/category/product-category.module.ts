import CoreBackendConfig from '@configs/core-backend.config';
import { RedisDataMaster } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
import { Channel } from 'diagnostics_channel';

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
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import { InventoryHttpservice } from '../config/inventory-http.service';
import { ProductCategoryController } from './controllers/product-category.controller';
import { ProductCategoryIntegration } from './integrations/product-category.integration';
import {
  ProductCategory,
  ProductCategorySchema,
} from './models/product-category.model';
import { ProductCategoryService } from './services/product-category.service';

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [CoreBackendConfig],
    }),
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
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
  controllers: [ProductCategoryController],
  providers: [
    ApplicationService,
    SlRedisService,
    LoggingInterceptor,
    ChannelService,
    AccountService,
    ProductCategoryService,
    ProductCategoryIntegration,
    InventoryHttpservice,
  ],
  exports: [],
})
export class ProductCategoryModule {}
