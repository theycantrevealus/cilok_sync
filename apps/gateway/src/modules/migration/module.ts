import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { RedisDataMaster, RedisMigration } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SlRedisService } from '@slredis/slredis.service';

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
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { MigrationController } from '@/migration/controller';
import { MigrationProcessor } from '@/migration/processor';
import { MigrationService } from '@/migration/service';
import { PIC, PICSchema } from '@/pic/models/pic.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import {
  ProgramTemplist,
  ProgramTemplistSchema,
} from '@/program/models/program.templist.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';
import { NotificationTemplate, NotificationTemplateSchema } from "@/notification/models/notification.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: Authorization.name, schema: AuthorizationSchema },

      { name: Lov.name, schema: LovSchema },
      { name: PIC.name, schema: PICSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Keyword.name, schema: KeywordSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.eligibility[0],
      KafkaConnProducer.eligibility[0],
    ]),
    BullModule.registerQueueAsync(RedisMigration),
    BullModule.registerQueueAsync(RedisDataMaster),
    LoggingModule,
    HttpModule,
  ],
  controllers: [MigrationController],
  providers: [
    ApplicationService,
    MigrationService,
    MigrationProcessor,
    TransactionOptionalService,
    ChannelService,
    AccountService,
    SlRedisService,
  ],
  exports: [MigrationService],
})
export class MigrationModule {
  //
}
