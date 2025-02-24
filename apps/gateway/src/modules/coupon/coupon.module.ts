import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

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
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { CouponController } from '@/coupon/controllers/coupon.controller';
import { Coupon, CouponSchema } from '@/coupon/models/coupon.model';
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/coupon/models/inject.coupon.model';
import { CouponService } from '@/coupon/services/coupon.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LoggingModule } from '@/logging/logging.module';
import { APILog, APILogSchema } from '@/logging/models/api.logs.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: APILog.name, schema: APILogSchema },
      { name: Account.name, schema: AccountSchema },
      { name: AccountLocation.name, schema: AccountLocationSchema },
      { name: AccountCredentialLog.name, schema: AccountCredentialLogSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
    LoggingModule,
    AccountModule,
    HttpModule,
  ],
  controllers: [CouponController],
  providers: [
    CouponService,
    LoggingInterceptor,
    AccountService,
    ChannelService,
  ],
  exports: [CouponService],
})
export class CouponModule {}
