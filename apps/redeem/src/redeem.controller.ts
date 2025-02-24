import { CounterMetric, PromCounter } from '@digikare/nestjs-prom';
import { CacheStore } from '@nestjs/cache-manager';
import {
  CACHE_MANAGER,
  Controller,
  HttpStatus,
  Inject,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { IAccount } from '@utils/logger/transport';
import { Cache } from 'cache-manager';
import { Logger } from 'winston';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';

import { RedeemService } from './redeem.service';

@Controller()
@UseFilters(RequestValidatorFilterCustom)
export class RedeemController {
  private applicationService: ApplicationService;
  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    private readonly redeemService: RedeemService,
    applicationService: ApplicationService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ConfigService) private configService: ConfigService,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    this.applicationService = applicationService;
  }

  @MessagePattern(process.env.KAFKA_REDEEM_TOPIC)
  async receiver(@Payload() payload): Promise<any> {
    const now = Date.now();
    console.log('PAYLOAD REDEEM CONSUMER', payload);
    try {
      await this.redeemService
        .prepare(payload, now)
        .then(async (result) => {
          await this.logger.verbose({
            method: 'kafka',
            statusCode: HttpStatus.OK,
            transaction_id: payload.transaction_id,
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - now,
            param: payload,
            step: 'Finish processing payload',
            service: 'REDEEM',
            result: {
              msisdn: payload.data.msisdn,
              url: 'redeem',
              user_id: new IAccount(payload.account),
              result: result,
            },
          });
        })
        .catch(async (e) => {
          await this.logger.error({
            method: 'kafka',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            transaction_id: payload.transaction_id,
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - now,
            param: payload,
            step: 'Redeem Exception',
            service: 'REDEEM',
            result: {
              msisdn: payload.data.msisdn,
              url: 'redeem',
              user_id: new IAccount(payload.account),
              result: {
                message: e.message,
                stack: e.stack,
              },
            },
          });
          return false;
        });
    } catch (error) {
      await this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: payload.transaction_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - now,
        param: payload,
        step: 'Exception',
        service: 'REDEEM',
        result: {
          msisdn: payload.data.msisdn,
          url: 'redeem',
          user_id: new IAccount(payload.account),
          result: {
            message: error.message,
            stack: error.stack,
          },
        },
      });
      return false;
    }
  }
}
