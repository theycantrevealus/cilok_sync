import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisDataMaster, RedisLocation } from "@configs/redis/redis.module";
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';
import { ExceptionHandler } from '@utils/logger/handler';

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
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import {
  LocationTemp,
  LocationTempSchema,
} from '@/location/models/location.temp.model';
import { LocationProcessor } from '@/location/processor/location.processor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { PIC, PICSchema } from '@/pic/models/pic.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';

import { LocationController } from './controllers/location.controller';
import {
  LocationBucket,
  LocationBucketSchema,
} from './models/location.bucket.model';
import { LocationHris, LocationHrisSchema } from './models/location.hris.model';
import { Location, LocationSchema } from './models/location.model';
import { LocationService } from './services/location.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: Location.name, schema: LocationSchema },
      { name: LocationHris.name, schema: LocationHrisSchema },
      { name: LocationTemp.name, schema: LocationTempSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: Lov.name, schema: LovSchema },
      { name: PIC.name, schema: PICSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.location[0],
      KafkaConnProducer.location[0],
    ]),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync(RedisDataMaster),
    LoggingModule,
    HttpModule,
  ],
  controllers: [LocationController],
  providers: [
    ApplicationService,
    LocationService,
    AccountService,
    ChannelService,
    LocationProcessor,
    SlRedisService,
    ExceptionHandler,
  ],
  exports: [LocationService],
})
export class LocationModule {
  //
}
