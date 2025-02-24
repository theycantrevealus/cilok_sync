
import CoreBackendConfig from '@configs/core-backend.config';
import { LoggingModule } from "@/logging/logging.module";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { ChannelService } from '@/channel/services/channel.service';
import { AccountService } from '@/account/services/account.service';
import { MongooseModule } from '@nestjs/mongoose';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Account, AccountSchema } from '@/account/models/account.model';
import { Channel } from 'diagnostics_channel';
import { ChannelSchema } from '@/channel/models/channel.model';
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountLocation, AccountLocationSchema } from '@/account/models/account.location.model';
import { AccountCredentialLog, AccountCredentialLogSchema } from '@/account/models/account.creadential.log.model';
import { InventoryHttpservice } from '../config/inventory-http.service';
import { ProductSubcategoryService } from './services/product-subcategory.service';
import { ProductSubcategoryIntegration } from './integrations/product-subcategory.integration';
import { ProductSubcategoryController } from './controllers/product-subcategory.controller';
import { ProductSubcategory, ProductSubcategorySchema } from './models/product-subcategory.model';
import { Authorization, AuthorizationSchema } from '@/account/models/authorization.model';
import { SystemConfig, SystemConfigSchema } from '@/application/models/system.config.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import { KeywordPriority, KeywordPrioritySchema } from "@/keyword/models/keyword.priority.model";
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";
import { Lov, LovSchema } from "@/lov/models/lov.model";
import { BullModule } from "@nestjs/bull";
import { RedisDataMaster } from "@configs/redis/redis.module";
import { ApplicationService } from "@/application/services/application.service";
import { SlRedisService } from "@slredis/slredis.service";

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
      { name: ProductSubcategory.name, schema: ProductSubcategorySchema },
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
  controllers: [
    ProductSubcategoryController
  ],
  providers: [
    ApplicationService,
    SlRedisService,
    LoggingInterceptor,
    ChannelService,
    AccountService,
    ProductSubcategoryService,
    ProductSubcategoryIntegration,
    InventoryHttpservice
  ],
  exports: []
})
export class ProductSubategoryModule { }
