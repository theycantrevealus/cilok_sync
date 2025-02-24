import {
  CACHE_MANAGER,
  Controller,
  HttpStatus,
  Inject,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { IAccount } from '@utils/logger/transport';
import { Cache } from 'cache-manager';
import { Logger } from 'winston';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';

import { RedeemFmcService } from './redeem.fmc.service';

@Controller()
@UseFilters(RequestValidatorFilterCustom)
export class RedeemFmcController {
  private applicationService: ApplicationService;
  constructor(
    @Inject(AccountService) private readonly accountService: AccountService,
    private readonly redeemService: RedeemFmcService,
    applicationService: ApplicationService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.applicationService = applicationService;
  }

  @MessagePattern(process.env.KAFKA_REDEEM_FMC_TOPIC)
  async receiver(@Payload() payload): Promise<any> {
    const now = Date.now();
    try {
      await this.redeemService
        .prepare_fmc(payload, now)
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
            service: 'REDEEM-FMC',
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
            step: 'Redeem FMC Exception',
            service: 'REDEEM-FMC',
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
        service: 'REDEEM-FMC',
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
