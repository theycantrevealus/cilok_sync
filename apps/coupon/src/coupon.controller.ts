import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { Controller, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedMSISDN,
  formatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';

import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { KafkaCouponService } from './coupon.service';
import { CouponLogService } from './service/log.service';

@Controller()
export class CouponController {
  private coupon_prefix: string;
  private coupon_product: string;
  private realm: string;
  private branch: string;
  private merchant: string;

  constructor(
    private readonly couponService: KafkaCouponService,
    private readonly couponLogService: CouponLogService,
    private readonly keywordService: KeywordService,
    private readonly customerService: CustomerService,
    private readonly programService: ProgramServiceV2,
    private readonly notifContentService: NotificationContentService,

    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,
    @Inject('COUPON_SERVICE_PRODUCER')
    private readonly clientCoupon: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
  ) {
    this.coupon_prefix = `${configService.get<string>(
      'core-backend.coupon_prefix.id',
    )}`;
    this.coupon_product = `${configService.get<string>(
      'core-backend.coupon_product.id',
    )}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }
  @MessagePattern(process.env.KAFKA_COUPON_TOPIC)
  async injectCoupon(@Payload() payload: any) {
    const start = new Date();
    try {
      const origin = payload.origin.split('.');
      if (origin[0] == 'inject_coupon') {
        // update payload
        payload = await this.couponService.buildPayload(payload, start);
        if (payload === false) {
          // build payload gagal, exit process
          return;
        }
      }
      console.log(payload);

      const eligibility = payload.keyword.eligibility;

      await this.couponLogService.verbose(
        payload,
        {},
        `Start inject coupon for ${eligibility?.poin_value}`,
        start,
      );
      // console.log(origin);

      if (
        (origin[0] == 'inject_coupon' && eligibility.poin_value != '') ||
        (origin[0] == 'redeem' && eligibility.poin_value == 'Flexible')
      ) {
        if (eligibility.poin_value === 'Fixed') {
          await this.couponService.process_inject_coupon(
            payload,
            payload.payload.coupon,
          );
        }
        // else if (eligibility.poin_value === 'Flexible') {
        //   await this.couponService.process_inject_coupon(
        //     payload,
        //     payload.payload.coupon,
        //   );
        // }
        else if (
          eligibility.poin_value === 'Fixed Multiple' ||
          eligibility.poin_value === 'Flexible'
        ) {
          let coupon = 1;

          if (origin[0] == 'inject_coupon') {
            // coupon = payload.incoming.total_coupon
            //   ? payload.incoming.total_coupon
            //   : 1;

            // updated on 2024-08-01 (confirmed by pak Alip)
            coupon = 1;
          } else {
            // coupon = payload.incoming.total_redeem
            //   ? payload.incoming.total_redeem
            //   : 1;

            // updated on 2024-08-01 (confirmed by pak Alip)
            coupon = 1;
          }

          if (payload?.retry?.coupon?.counter > 0) {
            coupon = 1;
          }

          for (let i = 1; i <= coupon; i++) {
            // console.log('loop ke', i);
            await this.couponLogService.verbose(
              payload,
              {},
              `Loop index: ${i}`,
              start,
            );

            if (payload?.retry?.coupon?.counter > 0) {
              payload.tracing_id = `${payload?.tracing_master_id}_r_${payload.retry.coupon.counter}`;
            } else {
              payload.tracing_id = `${payload?.tracing_master_id}_${i}`;
            }

            await this.couponLogService.verbose(
              payload,
              {},
              `Tracing_id: ${payload?.tracing_id}`,
              start,
            );

            // console.log('tracing_id', payload.tracing_id);
            // payload.rule.fixed_multiple.counter = i;

            await this.couponService.process_inject_coupon(
              payload,
              payload.payload.coupon,
            );
          }
        } else {
          await this.couponLogService.error(
            payload,
            start,
            `Failed, point value is unknown!`,
          );

          this.couponService.notification_coupon(
            'Fail, point value is unknown ',
            payload,
          );
        }
      } else {
        return this.couponService.process_inject_coupon(
          payload,
          payload.payload.coupon,
        );
      }
    } catch (e) {
      await this.couponLogService.verbose(
        payload,
        start,
        `An Error occured! ${e?.message}`,
        e?.trace,
      );
    }
  }
}
