import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import SoapConfig from '@configs/dsp.soap';
import { Environtment } from '@configs/environtment';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import {
  RedisCustomer,
  RedisDataMaster,
  RedisLocation,
  RedisProgram,
} from '@configs/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { SlconfigService } from '@slconfig/slconfig.service';
import { SlRedisService } from '@slredis/slredis.service';
import {
  TransactionMaster,
  TransactionMasterSchema,
} from '@transaction_master/models/transaction_master.model';
import {
  TransactionStepModel,
  TransactionStepSchema,
} from '@transaction_master/models/transaction_step.model';
// import { TransactionRecoveryService } from '@transaction_master/transaction_recovery.service';
import * as redisStore from 'cache-manager-ioredis';

// import { SoapModule, SoapModuleOptions } from 'nestjs-soap';
import { AccountModule } from '@/account/account.module';
import {
  Authorization,
  AuthorizationSchema,
} from '@/account/models/authorization.model';
import {
  BatchProcessLog,
  BatchProcessLogSchema,
} from '@/application/models/batch.log.model';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { Bank, BankSchema } from '@/bank/models/bank.model';
import { Channel, ChannelSchema } from '@/channel/models/channel.model';
import { ChannelService } from '@/channel/services/channel.service';
import { MainCrmbIntegration } from '@/crmb/integration/main.crmb.integration';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { CustomerModule } from '@/customer/customer.module';
import {
  CustomerBadge,
  CustomerBadgeSchema,
} from '@/customer/models/customer.badge.model';
import {
  CustomerBrand,
  CustomerBrandSchema,
} from '@/customer/models/customer.brand.model';
import { Customer, CustomerSchema } from '@/customer/models/customer.model';
import {
  CustomerTier,
  CustomerTierSchema,
} from '@/customer/models/customer.tier.model';
import {
  CustomerXBadge,
  CustomerXBadgeSchema,
} from '@/customer/models/customer.x.badge.model';
import { CustomerService } from '@/customer/services/customer.service';
import { EsbModule } from '@/esb/esb.module';
import { EsbProfileIntegration } from '@/esb/integration/esb.profile.integration';
import { EsbProfileService } from '@/esb/services/esb.profile.service';
import { RedeemModel, RedeemModelSchema } from '@/inject/models/redeem.model';
import { KeywordModule } from '@/keyword/keyword.module';
import {
  KeywordApprovalLog,
  KeywordApprovalLogSchema,
} from '@/keyword/models/keyword.approval.log';
import {
  KeywordEligibility,
  KeywordEligibilitySchema,
} from '@/keyword/models/keyword.eligibility.model';
import {
  KeywordEmployeeNumber,
  KeywordEmployeeNumberSchema,
} from '@/keyword/models/keyword.employee.number.model';
import { Keyword, KeywordSchema } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationSchema,
} from '@/keyword/models/keyword.notification.model';
import {
  KeywordPriority,
  KeywordPrioritySchema,
} from '@/keyword/models/keyword.priority.model';
import {
  KeywordShift,
  KeywordShiftSchema,
} from '@/keyword/models/keyword.shift.model';
import { KeywordType, KeywordTypeSchema } from '@/keyword/models/keyword.type';
import {
  LocationBucket,
  LocationBucketSchema,
} from '@/location/models/location.bucket.model';
import { Location, LocationSchema } from '@/location/models/location.model';
import { LocationService } from '@/location/services/location.service';
import { LoggingModule } from '@/logging/logging.module';
import { LovModule } from '@/lov/lov.module';
import { Lov, LovSchema } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantSchema } from '@/merchant/models/merchant.model';
import {
  NotificationFirebase,
  NotificationFirebaseSchema,
} from '@/notification/models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from '@/notification/models/notification.model';
import { OTP, OTPSchema } from '@/otp/models/otp.model';
import { OTPService } from '@/otp/services/otp.service';
import { PIC, PICSchema } from '@/pic/models/pic.model';
import {
  ProgramApprovalLog,
  ProgramApprovalLogSchema,
} from '@/program/models/program.approval.log';
import {
  ProgramBlacklist,
  ProgramBlacklistSchema,
} from '@/program/models/program.blacklist.model';
import { ProgramV2, ProgramV2Schema } from '@/program/models/program.model.v2';
import {
  ProgramNotification,
  ProgramNotificationSchema,
} from '@/program/models/program.notification.model.v2';
import {
  ProgramSegmentation,
  ProgramSegmentationSchema,
} from '@/program/models/program.segmentation.model';
import {
  ProgramTemplist,
  ProgramTemplistSchema,
} from '@/program/models/program.templist.model';
import {
  ProgramWhitelist,
  ProgramWhitelistSchema,
} from '@/program/models/program.whitelist.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { Stock, StockSchema } from '@/stock/models/stock.model';
import {
  DonationProcess,
  DonationProcessSchema,
} from '@/transaction/models/donation/donation.logger.model';
import {
  Donation,
  DonationSchema,
} from '@/transaction/models/donation/donation.model';
import {
  TransactionDonation,
  TransactionDonationSchema,
} from '@/transaction/models/donation/transaction_donation.model';
import {
  InjectCoupon,
  InjectCouponSchema,
} from '@/transaction/models/inject.coupon.model';
import {
  DeductPoint,
  DeductPointSchema,
} from '@/transaction/models/point/deduct.point.model';
import {
  RefundPoint,
  RefundPointSchema,
} from '@/transaction/models/point/refund.point.model';
import {
  CheckRedeem,
  CheckRedeemSchema,
} from '@/transaction/models/redeem/check.redeem.model';
import { Redeem, RedeemSchema } from '@/transaction/models/redeem/redeem.model';
import {
  Voucher,
  VoucherSchema,
} from '@/transaction/models/voucher/voucher.model';
import { DonationService } from '@/transaction/services/donation/donation.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { PointFmcService } from '@/transaction/services/point/point.fmc.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';
import { TransactionModule } from '@/transaction/transaction.module';
import { Vote, VoteSchema } from '@/vote/models/vote.model';
import { VoteOption, VoteOptionSchema } from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteSchema,
} from '@/vote/models/vote_transaction.model';
import { VoteService } from '@/vote/services/vote.service';

import {
  AuctionBidder,
  AuctionBidderSchema,
} from '../../auction/src/models/auction_bidder.model';
import { ExceptionHandler } from '../../utils/logger/handler';
import { WinstonModule } from '../../utils/logger/module';
import { WinstonCustomTransport } from '../../utils/logger/transport';
import { KafkaService } from './../../eligibility/src/kafka.service';
import { KafkaController } from './kafka.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
        SoapConfig,
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('redis.host'),
          port: configService.get<string>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          isGlobal: true,
        };
      },
      inject: [ConfigService],
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
      { name: AuctionBidder.name, schema: AuctionBidderSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },

      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerTier.name, schema: CustomerTierSchema },
      { name: CustomerBadge.name, schema: CustomerBadgeSchema },
      { name: CustomerBrand.name, schema: CustomerBrandSchema },
      { name: CustomerXBadge.name, schema: CustomerXBadgeSchema },
      { name: ProgramV2.name, schema: ProgramV2Schema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: RedeemModel.name, schema: RedeemModelSchema },
      { name: Lov.name, schema: LovSchema },
      { name: LocationBucket.name, schema: LocationBucketSchema },
      { name: Location.name, schema: LocationSchema },
      { name: PIC.name, schema: PICSchema },

      { name: ProgramSegmentation.name, schema: ProgramSegmentationSchema },
      { name: ProgramNotification.name, schema: ProgramNotificationSchema },
      { name: ProgramWhitelist.name, schema: ProgramWhitelistSchema },
      { name: ProgramBlacklist.name, schema: ProgramBlacklistSchema },
      { name: ProgramTemplist.name, schema: ProgramTemplistSchema },
      { name: ProgramApprovalLog.name, schema: ProgramApprovalLogSchema },

      { name: NotificationFirebase.name, schema: NotificationFirebaseSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },

      { name: Keyword.name, schema: KeywordSchema },
      { name: KeywordEligibility.name, schema: KeywordEligibilitySchema },
      { name: KeywordNotification.name, schema: KeywordNotificationSchema },
      { name: KeywordEmployeeNumber.name, schema: KeywordEmployeeNumberSchema },
      { name: KeywordShift.name, schema: KeywordShiftSchema },
      { name: KeywordType.name, schema: KeywordTypeSchema },
      { name: KeywordApprovalLog.name, schema: KeywordApprovalLogSchema },
      { name: Donation.name, schema: DonationSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: DonationProcess.name, schema: DonationProcessSchema },
      { name: TransactionDonation.name, schema: TransactionDonationSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Bank.name, schema: BankSchema },
      { name: BatchProcessLog.name, schema: BatchProcessLogSchema },
      { name: Redeem.name, schema: RedeemSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: CheckRedeem.name, schema: CheckRedeemSchema },
      { name: OTP.name, schema: OTPSchema },

      { name: Stock.name, schema: StockSchema },

      { name: Vote.name, schema: VoteSchema },
      { name: VoteOption.name, schema: VoteOptionSchema },
      { name: TransactionVote.name, schema: TransactionVoteSchema },
      { name: Authorization.name, schema: AuthorizationSchema },
      { name: InjectCoupon.name, schema: InjectCouponSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: DeductPoint.name, schema: DeductPointSchema },

      { name: TransactionMaster.name, schema: TransactionMasterSchema },
      { name: TransactionStepModel.name, schema: TransactionStepSchema },
      { name: KeywordPriority.name, schema: KeywordPrioritySchema },
      { name: RefundPoint.name, schema: RefundPointSchema },
    ]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const targetEnv: string =
          !process.env.NODE_ENV ||
          process.env.NODE_ENV === '' ||
          process.env.NODE_ENV === 'development'
            ? 'development'
            : process.env.NODE_ENV;
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          handleRejections: true,
          handleExceptions: true,
          transports: WinstonCustomTransport[targetEnv].eligibility_low,
        };
      },
    }),
    BullModule.registerQueueAsync(RedisCustomer),
    BullModule.registerQueueAsync(RedisProgram),
    ClientsModule.registerAsync([
      KafkaConn.eligibility[0],
      KafkaConn.notification[0],
      KafkaConn.deduct[0],
      KafkaConn.coupon[0],
      KafkaConn.void[0],
      KafkaConn.transaction_master[0],
      KafkaConn.redeem[0],
      KafkaConn.redeem_fmc[0],
      KafkaConn.redeem_high[0],
      KafkaConn.redeem_low[0],
      KafkaConn.notification_general[0],
      KafkaConn.inject_point[0],

      KafkaConnProducer.eligibility[0],
      KafkaConnProducer.notification[0],
      KafkaConnProducer.deduct[0],
      KafkaConnProducer.coupon[0],
      KafkaConnProducer.void[0],
      KafkaConnProducer.transaction_master[0],
      KafkaConnProducer.redeem[0],
      KafkaConnProducer.redeem_fmc[0],
      KafkaConnProducer.redeem_high[0],
      KafkaConnProducer.redeem_low[0],
      KafkaConnProducer.notification_general[0],
      KafkaConnProducer.inject_point[0],
      KafkaConnProducer.reporting_statistic[0],
    ]),
    BullModule.registerQueueAsync(RedisLocation),
    BullModule.registerQueueAsync({
      name: 'location-queue',
    }),
    BullModule.registerQueueAsync(RedisDataMaster),
    // SoapModule.forRootAsync({
    //   clientName: 'SOAP_CLIENT',
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (
    //     configService: ConfigService,
    //   ): Promise<SoapModuleOptions> => {
    //     return {
    //       uri: configService.get<string>('dsp.url'),
    //       clientName: 'SOAP_CLIENT',
    //       clientOptions: {
    //         wsdl_options: {
    //           timeout: configService.get<number>('dsp.timeout'),
    //         },
    //       },
    //     };
    //   },
    // }),
    KeywordModule,
    CustomerModule,
    LovModule,
    //ProgramModule,
    LoggingModule,
    AccountModule,
    HttpModule,
    TransactionModule,
    EsbModule,
    // ProgramModule,
    //TransactionModule
  ],
  controllers: [KafkaController],
  providers: [
    KafkaService,
    EligibilityService,
    LocationService,
    CustomerService,
    ProgramServiceV2,
    ChannelService,
    ApplicationService,
    LovService,
    DonationService,
    PointFmcService,
    NotificationContentService,
    RedeemService,
    OTPService,
    ExceptionHandler,
    CallApiConfigService,
    PointFmcService,
    MainCrmbService,
    MainCrmbIntegration,
    //HttpService,
    // TransactionRecoveryService,
    SlconfigService,
    SlRedisService,

    EsbProfileService,
    EsbProfileIntegration,
    VoteService,
  ],
})
export class KafkaModule {
  constructor() {
    //
  }
}
