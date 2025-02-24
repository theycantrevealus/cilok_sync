import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';

import { WINSTON_MODULE_PROVIDER } from '../..//utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';

@Injectable()
export class VoucherLogService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async loggerVoucherVerbose(payload, otherData, message, start) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        service: 'Voucher',
        user_id: payload?.account,
        step: 'Voucher Consumer Controller',
        param: payload,
        result: {
          message: message,
          trace: payload?.tracing_id,
          msisdn: payload?.incoming?.msisdn,
          ...otherData,
        },
      } satisfies LoggingData,
    });
  }

  async loggerVoucherError(payload, start, message, trace = {},stack="") {
    try {
      const end = new Date();
      await this.exceptionHandler.handle({
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          service: 'Voucher',
          user_id: payload?.account,
          step: 'Voucher Consumer Controller',
          param: payload,
          result: {
            message: message,
            trace: trace,
            result : {
              message: message,
              stack : stack
            }
          },
        } satisfies LoggingData,
      });
    } catch (error) {
      console.log("CATCH :: FAIL :: LOG VOUCHER")
      console.log(error)
      console.log("CATCH :: FAIL :: LOG VOUCHER")
    }
    
  }
}
