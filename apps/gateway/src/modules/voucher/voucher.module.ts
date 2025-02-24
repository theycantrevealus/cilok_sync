import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
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
import { Role, RoleSchema } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import { ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';
import { VoucherController } from '@/voucher/controllers/voucher.controller';
import { Voucher, VoucherSchema } from '@/transaction/models/voucher/voucher.model';
import { VoucherService } from '@/voucher/services/voucher.service';

import {
  Authorization,
  AuthorizationSchema,
} from '../account/models/authorization.model';

@Module({
  imports: [
    HttpModule,
    LoggingModule,
    MongooseModule.forFeature([
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
    ]),
    ClientsModule.registerAsync([
      KafkaConn.voucher[0],
      KafkaConnProducer.voucher[0],
    ]),
  ],
  controllers: [VoucherController],
  providers: [
    LoggingInterceptor,
    ChannelService,
    AccountService,
    VoucherService,
  ],
})
export class VoucherModule {}
