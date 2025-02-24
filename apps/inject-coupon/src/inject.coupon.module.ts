import ApplicationConfig from '@configs/application.config';
import { Environtment } from '@configs/environtment';
import InjectConfig from '@configs/inject.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import mongoConfig from '@configs/mongo.config';
import { RedisInject } from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

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
import { ApplicationService } from '@/application/services/application.service';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { CustomerModule } from '@/customer/customer.module';
import {
  InjectCouponModel,
  InjectCouponModelSchema,
} from '@/inject/models/inject.coupon.model';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';

import { InjectCouponController } from './inject.coupon.controller';
import { InjectCouponService } from './inject.coupon.service';
import { InjectCouponProcessor } from './processors/inject.coupon.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [Environtment, ApplicationConfig, mongoConfig, InjectConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db-name'),
        user: configService.get<string>('mongo.db-user'),
        pass: configService.get<string>('mongo.db-password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: InjectCouponModel.name, schema: InjectCouponModelSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.inject_coupon[0],
      KafkaConnProducer.inject_coupon[0],
    ]),
    HttpModule,
    CustomerModule,
    BullModule.registerQueueAsync(RedisInject),
  ],
  controllers: [InjectCouponController],
  providers: [
    ApplicationService,
    ChannelService,
    AccountService,
    InjectCouponService,
    InjectCouponProcessor,
  ],
  exports: [InjectCouponService],
})
export class InjectCouponModule {}
