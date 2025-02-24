import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandModule } from 'nestjs-command';

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
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { ExampleController } from '@/example/controllers/example.controller';
import {
  ExampleJoin,
  ExampleJoinSchema,
} from '@/example/models/example.join.model';
import { Example, ExampleSchema } from '@/example/models/example.model';
import { Examplev2, Examplev2Schema } from '@/example/models/example.v2.model';
import { ExampleService } from '@/example/services/example.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Authorization, AuthorizationSchema } from '../account/models/authorization.model';

import { ExampleJoinv2, ExampleJoinv2Schema } from './models/example.join.v2';
import { KafkaConn } from "@configs/kafka/connection";
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
    CommandModule,
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },

      { name: Example.name, schema: ExampleSchema },
      { name: ExampleJoin.name, schema: ExampleJoinSchema },
      { name: Examplev2.name, schema: Examplev2Schema },
      { name: ExampleJoinv2.name, schema: ExampleJoinv2Schema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: Lov.name, schema: LovSchema },
    ]),
    BullModule.registerQueueAsync(RedisDataMaster),
    ClientsModule.register([
      {
        name: 'REPORTING_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'reporting',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'SL',
          },
        },
      },
      {
        name: 'REPORTING_SERVICE_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'reporting',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'SL',
          },
        },
      }
    ]),
    LoggingModule,
    AccountModule,
    HttpModule,
  ],
  controllers: [ExampleController],
  providers: [
    ApplicationService,
    SlRedisService,
    ExampleService,
    ChannelService,
    LoggingInterceptor,
    AccountService,
  ],
  exports: [ExampleService],
})
export class ExampleModule {
  //
}
